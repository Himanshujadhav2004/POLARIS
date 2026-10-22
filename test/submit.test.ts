import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { alreadySubmitted } from "../src/publish/submit.js";

function batch(root: string, name: string, claimIds: string[], submitted: boolean): string {
  const dir = join(root, "us-politics", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "proposal.json"), JSON.stringify({ claims: claimIds.map((claimId) => ({ claimId })) }));
  if (submitted) writeFileSync(join(dir, "submission.json"), "{}");
  return dir;
}

describe("alreadySubmitted", () => {
  it("flags claims that went out in another submitted batch", () => {
    const root = mkdtempSync(join(tmpdir(), "polaris-"));
    batch(root, "batch-01", ["a", "b"], false);
    batch(root, "batch-02", ["b"], true);
    const current = batch(root, "batch-03", ["a", "b", "c"], false);
    expect(alreadySubmitted(current, ["a", "b", "c"])).toEqual([{ claimId: "b", batch: "batch-02" }]);
  });

  it("ignores the batch itself and batches that were never submitted", () => {
    const root = mkdtempSync(join(tmpdir(), "polaris-"));
    const current = batch(root, "batch-01", ["a"], true);
    batch(root, "batch-02", ["a"], false);
    expect(alreadySubmitted(current, ["a"])).toEqual([]);
  });
});
