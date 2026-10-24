import { describe, expect, it } from "vitest";
import { CARD_BY_NAME, IDEOLOGY_CARDS } from "../src/framework/ideologies.js";
import { renderFramework } from "../src/framework/render.js";
import { ALL_CRITERIA, DIMENSIONS, LEANING_BY_SCORE, LEANINGS_LEFT_TO_RIGHT, LEVEL_RULES, PUBLISH_RULES, RULES } from "../src/framework/rubric.js";

/** Ideology values on Geo after 2026-10-22 (Fascist and Zionist deleted). Both Libertarian values are used. */
const GEO_IDEOLOGIES = [
  "Anarchist", "Christian conservative", "Classical liberal", "Communist", "Conservative", "Democratic socialist",
  "Environmentalist", "Feminist", "Globalist", "Humanist", "Islamist", "Isolationist", "Liberal", "Libertarian",
  "Libertarianism", "MAGA", "Marxist", "Nationalist", "Neoconservative", "Neoliberal", "Paleoconservative",
  "Populist", "Progressive", "Secularist", "Social democrat", "Socialist", "Traditionalist",
];

describe("rubric", () => {
  it("gives every criterion a unique ID that encodes its score", () => {
    const ids = ALL_CRITERIA.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of ALL_CRITERIA) {
      const expected = c.score === 0 ? `${c.dimension}-0` : `${c.dimension}-${Math.abs(c.score)}${c.score < 0 ? "L" : "R"}`;
      expect(c.id).toBe(expected);
    }
  });

  it("has at most one criterion per score in each topic area, ordered left to right", () => {
    for (const d of DIMENSIONS) {
      const scores = d.criteria.map((c) => c.score);
      expect(new Set(scores).size).toBe(scores.length);
      expect([...scores].sort((a, b) => a - b)).toEqual(scores);
      expect(scores).toContain(-1);
      expect(scores).toContain(1);
      for (const c of d.criteria) expect(c.examples.length).toBeGreaterThan(0);
    }
  });

  it("lists the leanings left to right in score order", () => {
    expect(LEANINGS_LEFT_TO_RIGHT).toEqual([-3, -2, -1, 0, 1, 2, 3].map((s) => LEANING_BY_SCORE[String(s) as keyof typeof LEANING_BY_SCORE]));
  });

  it("maps every score to a Geo leaning", () => {
    for (const c of ALL_CRITERIA) expect(LEANING_BY_SCORE[String(c.score) as keyof typeof LEANING_BY_SCORE]).toBeTruthy();
  });

  it("defines every level once, for the scorer, the independent check and the verifier alike", () => {
    expect(Object.keys(LEVEL_RULES).sort()).toEqual([...LEANINGS_LEFT_TO_RIGHT].sort());
    for (const text of Object.values(LEVEL_RULES)) expect(text.length).toBeGreaterThan(30);
  });

  it("numbers the publish rules P1–P6 and has no partial-label rule left", () => {
    expect(PUBLISH_RULES.map((r) => r.id)).toEqual(["P1", "P2", "P3", "P4", "P5", "P6"]);
    const md = renderFramework();
    expect(md).not.toMatch(/Potential|confidence band/i);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
  });
});

describe("ideology cards", () => {
  it("has one tradition card per Geo ideology, all with their Geo ID", () => {
    const traditions = IDEOLOGY_CARDS.filter((c) => c.kind === "tradition");
    expect(traditions.map((c) => c.name).sort()).toEqual([...GEO_IDEOLOGIES].sort());
    for (const c of traditions) expect(c.geoId).toMatch(/^[0-9a-f]{32}$/);
  });

  it("has Armando's 86 issue leanings, none on Geo yet", () => {
    const issues = IDEOLOGY_CARDS.filter((c) => c.kind === "issue");
    expect(issues).toHaveLength(86);
    for (const c of issues) expect(c.geoId).toBeNull();
  });

  it("gives every card a definition, numbered positions and valid neighbours", () => {
    for (const card of IDEOLOGY_CARDS) {
      expect(card.definition.length).toBeGreaterThan(20);
      expect(card.tenets.length).toBeGreaterThan(0);
      expect(card.tenets.map((t) => t.id)).toEqual(card.tenets.map((_, i) => `T${i + 1}`));
      expect(card.typicalLeanings.length).toBeGreaterThan(0);
      for (const n of card.neighbours) expect(CARD_BY_NAME.has(n), `${card.name} → ${n}`).toBe(true);
    }
  });
});

describe("renderFramework", () => {
  it("documents every criterion, level, publish rule and card", () => {
    const md = renderFramework();
    for (const c of ALL_CRITERIA) expect(md).toContain(`**${c.id}**`);
    for (const r of PUBLISH_RULES) expect(md).toContain(`**${r.id}**`);
    for (const text of Object.values(LEVEL_RULES)) expect(md).toContain(text);
    for (const card of IDEOLOGY_CARDS) expect(md).toContain(card.kind === "issue" ? `**${card.name}**` : `### ${card.name}`);
  });
});
