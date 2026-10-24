import { describe, expect, it } from "vitest";
import { checkTaxonomySync } from "../src/agent/v3/agent.js";
import { judgeExample, loadExamples } from "../src/eval/examples.js";
import { CARD_BY_NAME, IDEOLOGY_CARDS, ISSUES, POLITICAL_LEANING_VALUES } from "../src/framework/ideologies.js";
import data from "../src/framework/leanings.json" with { type: "json" };
import { buildTaxonomy, type RawValue } from "../src/geo/taxonomy.js";

describe("Armando's leanings data", () => {
  it("has 27 traditions and 86 issue leanings across 42 issues, each issue with 2–3 sides", () => {
    expect(IDEOLOGY_CARDS.filter((c) => c.kind === "tradition")).toHaveLength(27);
    expect(ISSUES).toHaveLength(42);
    for (const { issue, sides } of ISSUES) {
      expect(sides.length, issue).toBeGreaterThanOrEqual(2);
      expect(sides.length, issue).toBeLessThanOrEqual(3);
      for (const side of sides) expect(side.neighbours.sort()).toEqual(sides.filter((s) => s !== side).map((s) => s.name).sort());
    }
  });

  it("applies the approved spelling fixes and keeps Pro-Taiwan independance as written", () => {
    for (const name of ["Pro-universal healthcare", "Pro-Iran containment", "Pro-legalization", "Anti-legalization", "Pro-internet freedom", "Anti-Zionist"]) {
      expect(CARD_BY_NAME.has(name), name).toBe(true);
    }
    expect(CARD_BY_NAME.has("Pro-Taiwan independance")).toBe(true);
    expect(CARD_BY_NAME.has("Pro Iran containment")).toBe(false);
    expect(IDEOLOGY_CARDS.every((c) => c.name === c.name.trim())).toBe(true);
  });

  it("lists the 7 spectrum values and Nonpartisan off the scale", () => {
    expect(POLITICAL_LEANING_VALUES.map((v) => v.name)).toEqual(["Far left", "Left", "Center left", "Center", "Center right", "Right", "Far right", "Nonpartisan"]);
    expect(POLITICAL_LEANING_VALUES.find((v) => v.name === "Left")?.alternativeNames).toContain("Liberal (US usage)");
  });
});

describe("checkTaxonomySync", () => {
  const leanings = (extra: string[] = []): RawValue[] =>
    [...POLITICAL_LEANING_VALUES.filter((v) => v.geoId), ...extra.map((name) => ({ name, geoId: name }))].map((v) => ({ id: v.geoId!, name: v.name, description: null }));
  const traditions: RawValue[] = data.ideologies.filter((i) => i.geoId).map((i) => ({ id: i.geoId!, name: i.name, description: null }));

  it("accepts Geo as it is today, with Armando's new values still pending", () => {
    expect(() => checkTaxonomySync(buildTaxonomy(leanings(), traditions, new Set()))).not.toThrow();
  });

  it("accepts Nonpartisan and a newly published issue leaning", () => {
    const published = [...traditions, { id: "aaaa", name: "Pro-life", description: null }];
    expect(() => checkTaxonomySync(buildTaxonomy(leanings(["Nonpartisan"]), published, new Set()))).not.toThrow();
  });

  it("refuses a Geo ideology without a card, a deleted card value and an unknown leaning", () => {
    expect(() => checkTaxonomySync(buildTaxonomy(leanings(), [...traditions, { id: "x", name: "Accelerationist", description: null }], new Set()))).toThrow(/no card/);
    expect(() => checkTaxonomySync(buildTaxonomy(leanings(), traditions.filter((t) => t.name !== "Populist"), new Set()))).toThrow(/no longer an Ideology/);
    expect(() => checkTaxonomySync(buildTaxonomy(leanings(["Moderate"]), traditions, new Set()))).toThrow(/unknown political leaning "Moderate"/);
  });
});

describe("Armando's examples", () => {
  it("is a valid multi-label test set", () => {
    const set = loadExamples("evals/armando-examples.json");
    expect(set.items.length).toBe(45);
    const marriage = set.items.find((i) => i.text === "Marriage is the best foundation for raising children");
    expect(marriage?.leanings.sort()).toEqual(["Christian conservative", "Conservative", "Social conservative"]);
  });

  it("splits published leanings into matched, extra and missed", () => {
    const item = { id: "x", text: "", leanings: ["Pro-life", "Christian conservative"] };
    expect(judgeExample(item, ["Pro-life", "MAGA"])).toEqual({ matched: ["Pro-life"], extra: ["MAGA"], missed: ["Christian conservative"] });
  });
});
