import { describe, expect, it } from "vitest";
import { buildTaxonomy, type RawValue } from "../src/geo/taxonomy.js";

const leanings: RawValue[] = [
  { id: "r", name: "Right", description: null },
  { id: "fl", name: "Far left", description: "Left extreme" },
  { id: "c", name: "Center", description: null },
];
const ideologies: RawValue[] = [
  { id: "soc", name: "Socialist", description: null },
  { id: "lib", name: "Libertarian", description: null },
  { id: "libism", name: "Libertarianism", description: null },
  { id: "blank", name: "  ", description: null },
];

describe("buildTaxonomy", () => {
  it("orders political leanings left to right and ideologies by name", () => {
    const t = buildTaxonomy(leanings, ideologies, [], new Set(["lib"]));
    expect(t.politicalLeanings.map((v) => v.name)).toEqual(["Far left", "Center", "Right"]);
    expect(t.ideologies.map((v) => v.name)).toEqual(["Libertarianism", "Socialist"]);
  });

  it("drops excluded and unnamed values", () => {
    const t = buildTaxonomy(leanings, ideologies, [], new Set(["lib"]));
    expect(t.byName.has("Libertarian")).toBe(false);
    expect(t.byName.get("Libertarianism")?.id).toBe("libism");
    expect([...t.byName.keys()]).not.toContain("");
  });

  it("rejects two values with the same name", () => {
    const dup = [...ideologies, { id: "soc2", name: "Socialist", description: null }];
    expect(() => buildTaxonomy(leanings, dup, [], new Set(["lib"]))).toThrow(/two values named "Socialist"/);
  });

  it("gives the same fingerprint regardless of input order", () => {
    const a = buildTaxonomy(leanings, ideologies, [], new Set(["lib"]));
    const b = buildTaxonomy([...leanings].reverse(), [...ideologies].reverse(), [], new Set(["lib"]));
    expect(a.fingerprint).toBe(b.fingerprint);
    const c = buildTaxonomy(leanings.slice(1), ideologies, [], new Set(["lib"]));
    expect(c.fingerprint).not.toBe(a.fingerprint);
  });
});
