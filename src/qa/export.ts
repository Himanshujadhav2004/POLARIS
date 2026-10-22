import { mkdirSync, writeFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { PROMPT_VERSION } from "../agent/prompt.js";
import { geoEntityUrl } from "../config.js";
import type { Claim } from "../geo/claims.js";
import type { Taxonomy } from "../geo/taxonomy.js";
import type { QaSample } from "../pipeline/qa-sample.js";

export const VERDICTS = ["Correct", "Partly correct", "Wrong label", "Should be blank", "Missed label"] as const;

const BLANK_REASONS: Record<string, string> = {
  factual_report: "Reports facts or what someone said",
  apolitical: "No political stake",
  consensus: "Shared across the spectrum",
  ambiguous: "Position unclear or contested",
};

interface Column {
  header: string;
  key: string;
  width: number;
  reviewer?: boolean;
}

const COLUMNS: Column[] = [
  { header: "Space", key: "space", width: 14 },
  { header: "Claim", key: "claim", width: 60 },
  { header: "Geo link", key: "link", width: 12 },
  { header: "Context", key: "context", width: 40 },
  { header: "Agent leaning", key: "leaning", width: 14 },
  { header: "Agent ideologies", key: "ideologies", width: 22 },
  { header: "Confidence", key: "confidence", width: 11 },
  { header: "Evidence", key: "evidence", width: 30 },
  { header: "Rationale", key: "rationale", width: 50 },
  { header: "Blank reason", key: "blankReason", width: 22 },
  { header: "QA verdict", key: "verdict", width: 16, reviewer: true },
  { header: "Correct leaning", key: "correctLeaning", width: 15, reviewer: true },
  { header: "Correct ideologies", key: "correctIdeologies", width: 22, reviewer: true },
  { header: "Notes", key: "notes", width: 30, reviewer: true },
  { header: "Reviewer", key: "reviewer", width: 14, reviewer: true },
  { header: "Claim ID", key: "claimId", width: 34 },
  { header: "Model", key: "model", width: 20 },
  { header: "Prompt version", key: "promptVersion", width: 9 },
];

function contextText(claim: Claim): string {
  return Object.entries(claim.context)
    .map(([kind, names]) => `${kind}: ${names.slice(0, 6).join(", ")}${names.length > 6 ? ", ..." : ""}`)
    .join(" | ");
}

type QaRecord = Record<string, string> & { link: string };

function toRecord(row: QaSample["rows"][number]): QaRecord {
  const { label } = row.result;
  return {
    space: row.space.name,
    claim: row.claim.text,
    link: geoEntityUrl(row.space.id, row.claim.id),
    context: contextText(row.claim),
    leaning: label.political_leaning ?? "",
    ideologies: label.ideologies.join(", "),
    confidence: row.result.abstained ? "" : label.confidence,
    evidence: label.evidence,
    rationale: label.rationale,
    blankReason: label.abstain_reason ? (BLANK_REASONS[label.abstain_reason] ?? label.abstain_reason) : "",
    verdict: "",
    correctLeaning: "",
    correctIdeologies: "",
    notes: "",
    reviewer: "",
    claimId: row.claim.id,
    model: row.result.resolvedModel,
    promptVersion: row.result.promptVersion,
  };
}

/** Writes qa_sample.xlsx, .csv and .json into `dir` (one folder per QA round). */
export async function exportQaSample(sample: QaSample, taxonomy: Taxonomy, dir: string): Promise<string[]> {
  mkdirSync(dir, { recursive: true });
  const records = sample.rows.map(toRecord);
  const generatedAt = new Date().toISOString();
  const model = sample.rows[0]?.result.resolvedModel ?? "";

  const wb = new ExcelJS.Workbook();
  wb.creator = "polaris-leanings";

  const how = wb.addWorksheet("How to review");
  how.columns = [{ width: 110 }];
  [
    "Leanings QA sample",
    "",
    "Each row is one claim. The agent either labelled it (Agent leaning / Agent ideologies) or left it blank (Blank reason).",
    "Open the Geo link if you need more context. Judge the claim's own position, not its topic.",
    "",
    "Fill in the yellow columns on the QA sheet:",
    `  QA verdict: ${VERDICTS.join(" / ")}`,
    "    Correct: the labels (or the blank) are right.",
    "    Partly correct: right direction, but a value is wrong or missing.",
    "    Wrong label: the agent labelled it, and the labels are wrong.",
    "    Should be blank: the agent labelled it, but it should have no label.",
    "    Missed label: the agent left it blank, but it should have a label.",
    "  Correct leaning / Correct ideologies: what it should be, when the verdict is not Correct.",
    "  Notes, Reviewer: optional.",
    "",
    `Generated ${generatedAt} with ${model}, prompt ${PROMPT_VERSION}, taxonomy ${taxonomy.fingerprint}, seed ${sample.seed}.`,
  ].forEach((line, i) => {
    const cell = how.getCell(i + 1, 1);
    cell.value = line;
    if (i === 0) cell.font = { bold: true, size: 14 };
  });

  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Space", key: "space", width: 16 },
    { header: "Claims in space", key: "total", width: 16 },
    { header: "Random claims classified", key: "pool", width: 24 },
    { header: "Labelled by agent", key: "labelled", width: 18 },
    { header: "Labelled share", key: "share", width: 15 },
    { header: "Rows in QA sample", key: "rows", width: 18 },
  ];
  for (const s of sample.stats) {
    summary.addRow({
      space: s.space.name,
      total: s.claimsInSpace,
      pool: s.pool,
      labelled: s.labelled,
      share: s.pool ? s.labelled / s.pool : 0,
      rows: s.rows,
    });
  }
  summary.getColumn("share").numFmt = "0%";
  summary.getColumn("total").numFmt = "#,##0";
  summary.getRow(1).font = { bold: true };

  const qa = wb.addWorksheet("QA", { views: [{ state: "frozen", ySplit: 1, xSplit: 2 }] });
  qa.columns = COLUMNS.map(({ header, key, width }) => ({ header, key, width }));
  for (const record of records) {
    const row = qa.addRow(record);
    row.getCell("link").value = { text: "Open", hyperlink: record.link };
    row.getCell("link").font = { color: { argb: "FF0563C1" }, underline: true };
  }
  qa.getRow(1).font = { bold: true };
  qa.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const leaningOptions = `"${["None", ...taxonomy.politicalLeanings.map((v) => v.name)].join(",")}"`;
  const verdictOptions = `"${VERDICTS.join(",")}"`;
  const reviewerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
  for (let r = 1; r <= records.length + 1; r++) {
    const row = qa.getRow(r);
    row.alignment = { vertical: "top", wrapText: true };
    COLUMNS.forEach((col, i) => {
      if (col.reviewer) row.getCell(i + 1).fill = reviewerFill;
    });
    if (r === 1) continue;
    row.getCell("verdict").dataValidation = { type: "list", allowBlank: true, formulae: [verdictOptions] };
    row.getCell("correctLeaning").dataValidation = { type: "list", allowBlank: true, formulae: [leaningOptions] };
  }

  const xlsxPath = `${dir}/qa_sample.xlsx`;
  await wb.xlsx.writeFile(xlsxPath);

  // CSV with a BOM so Excel opens it as UTF-8.
  const csvPath = `${dir}/qa_sample.csv`;
  const escape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  const csv = [COLUMNS.map((c) => c.header), ...records.map((r) => COLUMNS.map((c) => r[c.key] ?? ""))]
    .map((line) => line.map(escape).join(","))
    .join("\r\n");
  writeFileSync(csvPath, "﻿" + csv + "\r\n");

  // Machine-readable copy, used to join reviewer verdicts back to the agent's output.
  const manifestPath = `${dir}/qa_sample.json`;
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt,
        model,
        promptVersion: PROMPT_VERSION,
        taxonomyFingerprint: taxonomy.fingerprint,
        seed: sample.seed,
        stats: sample.stats.map((s) => ({ ...s, space: s.space.slug })),
        rows: sample.rows.map((r) => ({
          space: r.space.slug,
          claimId: r.claim.id,
          text: r.claim.text,
          abstained: r.result.abstained,
          label: r.result.label,
          valueIds: r.result.valueIds,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  return [xlsxPath, csvPath, manifestPath];
}
