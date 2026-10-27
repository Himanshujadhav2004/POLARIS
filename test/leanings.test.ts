import { describe, expect, it } from "vitest";
import { checkTaxonomySync } from "../src/agent/v3/agent.js";
import { judgeExample, loadExamples } from "../src/eval/examples.js";
import { canonicalName, CARD_BY_NAME, EXCLUDED_ALIASES, IDEOLOGY_CARDS, ISSUES, POLITICAL_LEANING_VALUES, RENAMED_ON_GEO } from "../src/framework/ideologies.js";
import data from "../src/framework/leanings.json" with { type: "json" };
import { buildTaxonomy, type RawValue } from "../src/geo/taxonomy.js";

describe("Armando's leanings data", () => {
  it("has 26 traditions (Ideological leaning) and 86 issue leanings (Issue position) across 43 issues", () => {
    expect(IDEOLOGY_CARDS.filter((c) => c.kind === "tradition")).toHaveLength(26);
    expect(IDEOLOGY_CARDS.filter((c) => c.kind === "issue")).toHaveLength(86);
    expect(IDEOLOGY_CARDS.every((c) => c.geoId)).toBe(true);
    expect(ISSUES).toHaveLength(43);
    // Geo moved Social conservative to Ideological leaning and Isolationist to Issue position, leaving one side each.
    expect(ISSUES.filter((i) => i.sides.length === 1).map((i) => i.issue).sort()).toEqual(["Isolationism", "LGBTQ"]);
    for (const { issue, sides } of ISSUES) {
      expect(sides.length, issue).toBeLessThanOrEqual(3);
      for (const side of sides) {
        if (sides.length > 1) expect(side.neighbours.length, side.name).toBeGreaterThan(0);
        // Other sides are reciprocal and always on the same issue.
        for (const n of side.neighbours) {
          expect(CARD_BY_NAME.get(n)?.issue, `${side.name} → ${n}`).toBe(issue);
          expect(CARD_BY_NAME.get(n)?.neighbours, `${n} ← ${side.name}`).toContain(side.name);
        }
      }
    }
  });

  it("follows Geo's removal of Libertarianism: no card, another name for Libertarian", () => {
    expect(CARD_BY_NAME.has("Libertarianism")).toBe(false);
    expect(CARD_BY_NAME.get("Libertarian")?.aliases).toContain("Libertarianism");
    expect(data.ideologies.some((i) => i.name === "Libertarianism")).toBe(true); // Armando's data is kept as he wrote it
  });

  it("treats Pro-innovation and Techno-optimist, and Pro-Palestinian and Anti-Zionist, as one side", () => {
    expect(CARD_BY_NAME.get("Pro-innovation")?.neighbours).toEqual(["Decelerationist"]);
    expect(CARD_BY_NAME.get("Techno-optimist")?.neighbours).toEqual(["Decelerationist"]);
    expect(CARD_BY_NAME.get("Decelerationist")?.neighbours.sort()).toEqual(["Pro-innovation", "Techno-optimist"]);
    expect(CARD_BY_NAME.get("Anti-Zionist")?.neighbours).toEqual(["Pro-Israel"]);
    expect(CARD_BY_NAME.get("Pro-Israel")?.neighbours.sort()).toEqual(["Anti-Zionist", "Pro-Palestinian"]);
  });

  it("leaves out of the prompts only alternative names that are really in his doc", () => {
    for (const [name, excluded] of Object.entries(EXCLUDED_ALIASES)) {
      const card = CARD_BY_NAME.get(name);
      expect(card, name).toBeDefined();
      expect(card!.excludedAliases.sort(), name).toEqual([...excluded].sort());
      for (const a of excluded) expect(card!.aliases, name).not.toContain(a);
    }
  });

  it("follows Geo's renames, dropping the old names, whose meaning was wider", () => {
    for (const [old, renamed] of Object.entries(RENAMED_ON_GEO)) {
      expect(CARD_BY_NAME.has(old), old).toBe(false);
      expect(CARD_BY_NAME.get(renamed)?.aliases, renamed).toEqual([]);
      expect(canonicalName(old)).toBe(renamed);
    }
    expect(CARD_BY_NAME.get("Ukraine aid skeptic")?.neighbours).toEqual(["Pro-Ukraine"]);
    expect(CARD_BY_NAME.get("Social conservative")?.kind).toBe("tradition");
    expect(CARD_BY_NAME.get("Isolationist")?.kind).toBe("issue");
  });

  it("applies the approved spelling fixes", () => {
    for (const name of ["Pro-universal healthcare", "Pro-Iran containment", "Pro-legalization", "Prohibitionist", "Pro-internet freedom", "Anti-Zionist"]) {
      expect(CARD_BY_NAME.has(name), name).toBe(true);
    }
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
  // Geo as it is now: every card is a value of its type, with the card's description.
  const values = (kind: "tradition" | "issue"): RawValue[] =>
    IDEOLOGY_CARDS.filter((c) => c.kind === kind).map((c) => ({ id: c.geoId!, name: c.name, description: c.definition }));
  const traditions = values("tradition");
  const issues = values("issue");
  const sync = (l: RawValue[], t: RawValue[], i: RawValue[]) => () => checkTaxonomySync(buildTaxonomy(l, t, i, new Set()));

  it("accepts Geo as it is today, and Nonpartisan", () => {
    expect(sync(leanings(), traditions, issues)).not.toThrow();
    expect(sync(leanings(["Nonpartisan"]), traditions, issues)).not.toThrow();
  });

  it("refuses a value without a card, a card missing from Geo, the wrong type and an unknown leaning", () => {
    expect(sync(leanings(), [...traditions, { id: "x", name: "Accelerationist", description: null }], issues)).toThrow(/no card/);
    expect(sync(leanings(), traditions.filter((t) => t.name !== "Populist"), issues)).toThrow(/"Populist" is not a Ideological leaning on Geo/);
    const social = traditions.find((t) => t.name === "Social conservative")!;
    expect(sync(leanings(), traditions.filter((t) => t !== social), [...issues, social])).toThrow(/is of type Issue position on Geo but its card is a tradition/);
    expect(sync(leanings(["Moderate"]), traditions, issues)).toThrow(/unknown political leaning "Moderate"/);
  });

  it("takes definitions from Armando's Notion doc, not from Geo's text", () => {
    expect(sync(leanings(), traditions.map((t) => ({ ...t, description: "Identifies with something." })), issues)).not.toThrow();
  });
});

describe("Armando's examples", () => {
  it("is a valid multi-label test set", () => {
    const set = loadExamples("evals/armando-examples.json");
    expect(set.items.length).toBe(45);
    const marriage = set.items.find((i) => i.text === "Marriage is the best foundation for raising children");
    expect(marriage?.leanings.sort()).toEqual(["Christian conservative", "Conservative", "Social conservative"]);
    // His Libertarianism label counts as Libertarian since Geo removed the duplicate.
    const guns = set.items.find((i) => i.text === "The right to own a gun is a fundamental human right");
    expect(guns?.leanings.sort()).toEqual(["Libertarian", "Pro-gun rights"]);
  });

  it("splits published leanings into matched, extra and missed", () => {
    const item = { id: "x", text: "", leanings: ["Pro-life", "Christian conservative"] };
    expect(judgeExample(item, ["Pro-life", "MAGA"])).toEqual({ matched: ["Pro-life"], extra: ["MAGA"], missed: ["Christian conservative"] });
  });
});
