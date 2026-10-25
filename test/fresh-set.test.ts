import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { drawIds, usedClaimIds } from "../src/pipeline/fresh-set.js";
import { seededRng } from "../src/util/random.js";

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

  it("covers every claim of test-set-v1 and Armando's examples by default", () => {
    const ids = usedClaimIds({ qaRoot: "missing", proposalsRoot: "missing", freshRoot: "missing" });
    for (const file of ["evals/test-set-v1.json", "evals/armando-examples.json"]) {
      const set = (JSON.parse(readFileSync(file, "utf8")) as { items: { id: string }[] }).items;
      for (const { id } of set) expect(ids.has(id)).toBe(true);
    }
  });
});

describe("drawIds", () => {
  // A fake Geo client that answers the pivot query with claims whose text contains the filter, if any.
  const claims = [
    { id: "1".repeat(32), name: "Congress should cut taxes" },
    { id: "2".repeat(32), name: "Bitcoin hit a record" },
    { id: "3".repeat(32), name: "States must expand Medicaid" },
  ];
  const geo = {
    query: async (_q: string, v: { filter: { id: { greaterThan: string }; name?: { includes: string } } }) => ({
      entities: claims.filter((c) => c.id > v.filter.id.greaterThan && (!v.filter.name || c.name.includes(v.filter.name.includes))).slice(0, 2),
    }),
  } as never;

  it("draws only claims containing one of the texts, split across them", async () => {
    const ids = await drawIds(geo, "space", 4, seededRng(1), [" should ", " must "]);
    expect(new Set(ids)).toEqual(new Set(["1".repeat(32), "3".repeat(32)]));
  });
  it("draws any claim without texts", async () => {
    expect((await drawIds(geo, "space", 3, seededRng(1))).length).toBeGreaterThan(0);
  });
});
