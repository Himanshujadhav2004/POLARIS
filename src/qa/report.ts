import type { Manifest, ManifestRow, Verdict } from "./verdicts.js";

export interface Bars {
  /** Minimum share of agent labels marked Correct. */
  labels: number;
  /** Minimum share of agent blanks marked Correct. */
  blanks: number;
}

interface Tally {
  reviewed: number;
  correct: number;
}

export interface Issue {
  row: ManifestRow;
  verdict: Verdict;
}

export interface QaReport {
  model: string;
  promptVersion: string;
  reviewers: string[];
  rows: number;
  notReviewed: number;
  labels: Tally & { partly: number; wrong: number; shouldBeBlank: number };
  blanks: Tally & { missed: number };
  bySpace: { space: string; labels: Tally; blanks: Tally }[];
  issues: Issue[];
  /** Verdicts that do not fit the row, e.g. "Missed label" on a row the agent labelled. Left out of the scores. */
  inconsistent: Issue[];
  bars: Bars;
  passes: { labels: boolean; blanks: boolean };
}

const LABEL_VERDICTS = new Set(["Correct", "Partly correct", "Wrong label", "Should be blank"]);
const BLANK_VERDICTS = new Set(["Correct", "Missed label"]);

export function computeQaReport(manifest: Manifest, verdicts: Verdict[], bars: Bars): QaReport {
  const byId = new Map(verdicts.map((v) => [v.claimId, v]));
  const report: QaReport = {
    model: manifest.model,
    promptVersion: manifest.promptVersion,
    reviewers: [...new Set(verdicts.map((v) => v.reviewer).filter(Boolean))],
    rows: manifest.rows.length,
    notReviewed: 0,
    labels: { reviewed: 0, correct: 0, partly: 0, wrong: 0, shouldBeBlank: 0 },
    blanks: { reviewed: 0, correct: 0, missed: 0 },
    bySpace: [],
    issues: [],
    inconsistent: [],
    bars,
    passes: { labels: false, blanks: false },
  };
  const spaces = new Map<string, { labels: Tally; blanks: Tally }>();

  for (const row of manifest.rows) {
    const verdict = byId.get(row.claimId);
    if (!verdict?.verdict) {
      report.notReviewed++;
      continue;
    }
    const v = verdict.verdict;
    if (!(row.abstained ? BLANK_VERDICTS : LABEL_VERDICTS).has(v)) {
      report.inconsistent.push({ row, verdict });
      continue;
    }
    const space = spaces.get(row.space) ?? { labels: { reviewed: 0, correct: 0 }, blanks: { reviewed: 0, correct: 0 } };
    spaces.set(row.space, space);
    const bucket = row.abstained ? space.blanks : space.labels;
    bucket.reviewed++;
    if (v === "Correct") bucket.correct++;
    else report.issues.push({ row, verdict });

    if (row.abstained) {
      report.blanks.reviewed++;
      if (v === "Correct") report.blanks.correct++;
      else report.blanks.missed++;
    } else {
      report.labels.reviewed++;
      if (v === "Correct") report.labels.correct++;
      else if (v === "Partly correct") report.labels.partly++;
      else if (v === "Wrong label") report.labels.wrong++;
      else report.labels.shouldBeBlank++;
    }
  }

  report.bySpace = [...spaces.entries()].map(([space, t]) => ({ space, ...t }));
  const share = (t: Tally) => (t.reviewed ? t.correct / t.reviewed : 0);
  report.passes = {
    labels: report.labels.reviewed > 0 && share(report.labels) >= bars.labels,
    blanks: report.blanks.reviewed > 0 && share(report.blanks) >= bars.blanks,
  };
  return report;
}

const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)}%)` : "-");

function agentText(row: ManifestRow): string {
  if (row.abstained) return "blank";
  return [row.label.political_leaning, ...row.label.ideologies].filter(Boolean).join(", ");
}

function correction(v: Verdict): string {
  return [v.correctLeaning, ...v.correctIdeologies].filter(Boolean).join(", ");
}

export function renderQaReport(r: QaReport, source: string): string {
  const reviewed = r.labels.reviewed + r.blanks.reviewed;
  const lines = [
    `# QA report: ${r.model}, prompt ${r.promptVersion}`,
    "",
    `Source: \`${source}\`${r.reviewers.length ? `, reviewed by ${r.reviewers.join(", ")}` : ""}.`,
    "",
    "## Result",
    "",
    "| Measure | Result | Bar | Pass |",
    "|---|---|---|---|",
    `| Agent labels marked Correct | ${pct(r.labels.correct, r.labels.reviewed)} | ${Math.round(r.bars.labels * 100)}% | ${r.passes.labels ? "Yes" : "No"} |`,
    `| Agent blanks marked Correct | ${pct(r.blanks.correct, r.blanks.reviewed)} | ${Math.round(r.bars.blanks * 100)}% | ${r.passes.blanks ? "Yes" : "No"} |`,
    `| All rows marked Correct | ${pct(r.labels.correct + r.blanks.correct, reviewed)} | | |`,
    "",
    `Labels: ${r.labels.correct} correct, ${r.labels.partly} partly correct, ${r.labels.wrong} wrong, ${r.labels.shouldBeBlank} should be blank.`,
    `Counting partly correct as right: ${pct(r.labels.correct + r.labels.partly, r.labels.reviewed)}.`,
    `Blanks: ${r.blanks.correct} correct, ${r.blanks.missed} missed a label.`,
    `${r.notReviewed} of ${r.rows} rows have no verdict yet.`,
    "",
    "## By space",
    "",
    "| Space | Labels correct | Blanks correct |",
    "|---|---|---|",
    ...r.bySpace.map((s) => `| ${s.space} | ${pct(s.labels.correct, s.labels.reviewed)} | ${pct(s.blanks.correct, s.blanks.reviewed)} |`),
    "",
    "## Rows not marked Correct",
    "",
  ];
  if (!r.issues.length) lines.push("None.", "");
  for (const { row, verdict } of r.issues) {
    const fix = correction(verdict);
    lines.push(
      `- **${verdict.verdict}** [${row.space}] ${row.text}`,
      `  - Agent: ${agentText(row)}${fix ? ` | Reviewer: ${fix}` : ""}`,
      ...(verdict.notes ? [`  - Note: ${verdict.notes}`] : []),
    );
  }
  if (r.inconsistent.length) {
    lines.push("", "## Verdicts that do not fit the row (left out of the scores)", "");
    for (const { row, verdict } of r.inconsistent) {
      lines.push(`- "${verdict.verdict}" on a row the agent ${row.abstained ? "left blank" : "labelled"}: ${row.text}`);
    }
  }
  return lines.join("\n") + "\n";
}
