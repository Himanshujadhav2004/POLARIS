import { describe, expect, it } from "vitest";
import { CARD_BY_NAME, IDEOLOGY_CARDS } from "../src/framework/ideologies.js";
import { renderFramework } from "../src/framework/render.js";
import { ALL_CRITERIA, CONFIDENCE, DIMENSIONS, LEANING_BY_SCORE, LEANINGS_LEFT_TO_RIGHT } from "../src/framework/rubric.js";

/** Ideology values on Geo on 2026-10-22, minus the excluded duplicate "Libertarian". */
const GEO_IDEOLOGIES = [
  "Anarchist", "Christian conservative", "Classical liberal", "Communist", "Conservative", "Democratic socialist",
  "Environmentalist", "Fascist", "Feminist", "Globalist", "Humanist", "Islamist", "Isolationist", "Liberal",
  "Libertarianism", "MAGA", "Marxist", "Nationalist", "Neoconservative", "Neoliberal", "Paleoconservative",
  "Populist", "Progressive", "Secularist", "Social democrat", "Socialist", "Traditionalist", "Zionist",
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

  it("splits confidence into parts that add up to 100", () => {
    expect(CONFIDENCE.components.reduce((s, c) => s + c.max, 0)).toBe(100);
  });
});

describe("ideology cards", () => {
  it("has exactly one card per Geo ideology", () => {
    expect(IDEOLOGY_CARDS.map((c) => c.name).sort()).toEqual([...GEO_IDEOLOGIES].sort());
  });

  it("gives every card a definition, numbered beliefs and valid neighbours", () => {
    for (const card of IDEOLOGY_CARDS) {
      expect(card.definition.length).toBeGreaterThan(40);
      expect(card.geoId).toMatch(/^[0-9a-f]{32}$/);
      expect(card.tenets.length).toBeGreaterThan(0);
      expect(card.tenets.map((t) => t.id)).toEqual(card.tenets.map((_, i) => `T${i + 1}`));
      expect(card.typicalLeanings.length).toBeGreaterThan(0);
      for (const n of card.neighbours) expect(CARD_BY_NAME.has(n), `${card.name} → ${n}`).toBe(true);
    }
  });
});

describe("renderFramework", () => {
  it("documents every criterion and every card", () => {
    const md = renderFramework();
    for (const c of ALL_CRITERIA) expect(md).toContain(`**${c.id}**`);
    for (const card of IDEOLOGY_CARDS) expect(md).toContain(`### ${card.name}`);
  });
});
