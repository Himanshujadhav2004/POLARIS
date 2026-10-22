import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { usedClaimIds } from "../src/pipeline/fresh-set.js";

const write = (file: string, value: unknown) => {
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
};

describe("usedClaimIds", () => {
  it("excludes the dev set, QA rounds, test sets, proposals and earlier fresh sets", () => {
    const root = mkdtempSync(join(tmpdir(), "fresh-"));
    write(join(root, "qa", "v1-seed1", "qa_sample.json"), { rows: [{ claimId: "qa1" }] });
    write(join(root, "test-set.json"), { items: [{ id: "test1" }] });
    write(join(root, "proposals", "us-politics", "batch-01", "proposal.json"), { claims: [{ claimId: "prop1" }] });
    write(join(root, "fresh", "fresh-seed3", "fresh.json"), { rows: [{ claimId: "fresh1" }] });

    const ids = usedClaimIds({
      qaRoot: join(root, "qa"),
      testSets: [join(root, "test-set.json")],
      proposalsRoot: join(root, "proposals"),
      freshRoot: join(root, "fresh"),
    });
    for (const id of ["qa1", "test1", "prop1", "fresh1"]) expect(ids.has(id)).toBe(true);
    const devSet = (JSON.parse(readFileSync("evals/dev-set.json", "utf8")) as { items: { id: string }[] }).items;
    for (const { id } of devSet) expect(ids.has(id)).toBe(true);
  });

  it("covers every claim of test-set-v1 by default", () => {
    const ids = usedClaimIds({ qaRoot: "missing", proposalsRoot: "missing", freshRoot: "missing" });
    const set = (JSON.parse(readFileSync("evals/test-set-v1.json", "utf8")) as { items: { id: string }[] }).items;
    for (const { id } of set) expect(ids.has(id)).toBe(true);
  });
});
