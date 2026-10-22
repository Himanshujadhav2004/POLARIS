import { describe, expect, it } from "vitest";
import { computeQaReport, renderQaReport } from "../src/qa/report.js";
import type { Manifest, Verdict } from "../src/qa/verdicts.js";

const row = (claimId: string, space: string, abstained: boolean) => ({
  claimId,
  space,
  text: `claim ${claimId}`,
  abstained,
  label: abstained ? { political_leaning: null, ideologies: [] } : { political_leaning: "Left", ideologies: ["Progressive"] },
});

const manifest: Manifest = {
  model: "gpt-5.5",
  promptVersion: "v1",
  rows: [row("l1", "a", false), row("l2", "a", false), row("l3", "b", false), row("b1", "a", true), row("b2", "b", true), row("b3", "b", true)],
};

const v = (claimId: string, verdict: Verdict["verdict"], notes = ""): Verdict => ({
  claimId,
  verdict,
  correctLeaning: "",
  correctIdeologies: [],
  notes,
  reviewer: "QA",
});

describe("computeQaReport", () => {
  const report = computeQaReport(
    manifest,
    [v("l1", "Correct"), v("l2", "Should be blank", "report"), v("l3", "Partly correct"), v("b1", "Correct"), v("b2", "Missed label")],
    { labels: 0.9, blanks: 0.85 },
  );

  it("scores labels and blanks separately", () => {
    expect(report.labels).toEqual({ reviewed: 3, correct: 1, partly: 1, wrong: 0, shouldBeBlank: 1 });
    expect(report.blanks).toEqual({ reviewed: 2, correct: 1, missed: 1 });
    expect(report.notReviewed).toBe(1);
  });

  it("checks the bars", () => {
    expect(report.passes).toEqual({ labels: false, blanks: false });
  });

  it("breaks results down by space", () => {
    expect(report.bySpace).toContainEqual({ space: "a", labels: { reviewed: 2, correct: 1 }, blanks: { reviewed: 1, correct: 1 } });
  });

  it("lists every row not marked Correct", () => {
    expect(report.issues.map((i) => i.row.claimId)).toEqual(["l2", "l3", "b2"]);
    expect(renderQaReport(report, "x.xlsx")).toContain("Note: report");
  });

  it("keeps verdicts that do not fit the row out of the scores", () => {
    const r = computeQaReport(manifest, [v("l1", "Missed label"), v("b1", "Wrong label")], { labels: 0.9, blanks: 0.85 });
    expect(r.inconsistent).toHaveLength(2);
    expect(r.labels.reviewed + r.blanks.reviewed).toBe(0);
  });
});
