import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { VERDICTS } from "./export.js";

export type VerdictValue = (typeof VERDICTS)[number];

export interface Verdict {
  claimId: string;
  verdict: VerdictValue | null;
  correctLeaning: string;
  correctIdeologies: string[];
  notes: string;
  reviewer: string;
}

export interface ManifestRow {
  space: string;
  claimId: string;
  text: string;
  abstained: boolean;
  label: { political_leaning: string | null; ideologies: string[] };
}

export interface Manifest {
  model: string;
  promptVersion: string;
  rows: ManifestRow[];
}

export function readManifest(path: string): Manifest {
  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
}

/** Reads reviewer columns from the QA sheet. Columns are found by header, so reordering is fine. */
export async function readVerdicts(path: string): Promise<Verdict[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const sheet = wb.getWorksheet("QA");
  if (!sheet) throw new Error(`${path} has no "QA" sheet`);

  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => columns.set(cell.text.trim(), col));
  const col = (header: string) => {
    const index = columns.get(header);
    if (index === undefined) throw new Error(`${path}: column "${header}" is missing from the QA sheet`);
    return index;
  };
  const c = {
    claimId: col("Claim ID"),
    verdict: col("QA verdict"),
    leaning: col("Correct leaning"),
    ideologies: col("Correct ideologies"),
    notes: col("Notes"),
    reviewer: col("Reviewer"),
  };

  const verdicts: Verdict[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const text = (n: number) => row.getCell(n).text.trim();
    const claimId = text(c.claimId);
    if (!claimId) return;
    const raw = text(c.verdict);
    const verdict = VERDICTS.find((v) => v.toLowerCase() === raw.toLowerCase()) ?? null;
    if (raw && !verdict) throw new Error(`${path} row ${index}: unknown verdict "${raw}". Use one of: ${VERDICTS.join(", ")}`);
    verdicts.push({
      claimId,
      verdict,
      correctLeaning: text(c.leaning),
      correctIdeologies: text(c.ideologies).split(",").map((s) => s.trim()).filter(Boolean),
      notes: text(c.notes),
      reviewer: text(c.reviewer),
    });
  });
  return verdicts;
}
