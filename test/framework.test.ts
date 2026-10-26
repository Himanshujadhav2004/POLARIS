import { describe, expect, it } from "vitest";
import { buildDecisionQuestions } from "../src/agent/v3/decisions.js";
import { buildScorerPrompt } from "../src/agent/v3/prompt.js";
import { loadChallenge } from "../src/eval/challenge.js";
import { loadExamples } from "../src/eval/examples.js";
import { CARD_BY_NAME, IDEOLOGY_CARDS } from "../src/framework/ideologies.js";
import { renderFramework } from "../src/framework/render.js";
import {
  ALIAS_RULE,
  ALL_CRITERIA,
  DIMENSIONS,
  EFFECT_RULE,
  IDEOLOGY_RULES,
  LEANING_BY_SCORE,
  LEANINGS_LEFT_TO_RIGHT,
  LEVEL_RULES,
  PUBLISH_RULES,
  RULES,
} from "../src/framework/rubric.js";

/** Ideology values on Geo after 2026-10-26 (Fascist and Zionist deleted on 10-22, the duplicate Libertarianism on 10-26). */
const GEO_IDEOLOGIES = [
  "Anarchist", "Christian conservative", "Classical liberal", "Communist", "Conservative", "Democratic socialist",
  "Environmentalist", "Feminist", "Globalist", "Humanist", "Islamist", "Isolationist", "Liberal", "Libertarian",
  "MAGA", "Marxist", "Nationalist", "Neoconservative", "Neoliberal", "Paleoconservative",
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

  it("counts a side argued through its effects (E2) for positions and ideological leanings alike", () => {
    expect(RULES.find((r) => r.id === "E2")?.text).toBe(EFFECT_RULE);
    for (const id of ["I1", "I2"]) expect(IDEOLOGY_RULES.find((r) => r.id === id)?.text).toContain("rule E2");
    expect(renderFramework()).toContain(EFFECT_RULE);
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

describe("framework text shared by every prompt (v3.4)", () => {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const examples = ALL_CRITERIA.flatMap((c) => c.examples.map(norm));

  it("uses none of Armando's example claims, or challenge-set claims, as a criterion example, so both stay fair tests", () => {
    const armando = loadExamples("evals/armando-examples.json").items.map((i) => norm(i.text));
    const challenge = loadChallenge("evals/challenge-set-v1.json").items.map((i) => norm(i.text));
    for (const text of [...armando, ...challenge]) expect(examples, text).not.toContain(text);
  });

  it("states the alias rule (I7) and the limited effect rule (E2) in the scorer prompt and the verifier's framework", () => {
    for (const prompt of [buildScorerPrompt(), renderFramework()]) {
      expect(prompt).toContain(ALIAS_RULE);
      expect(prompt).toContain(EFFECT_RULE);
    }
    expect(EFFECT_RULE).toMatch(/technology, product, substance, medicine/);
  });

  it("leaves names that contradict their side out of every prompt", () => {
    const decisions = buildDecisionQuestions({ politicalLeanings: [], ideologies: [], fingerprint: "test", byName: new Map() })
      .map((q) => ("instructions" in q ? q.instructions : ""))
      .join("\n");
    for (const name of ["Pro-negotiated settlement", "Ambiguity advocate", "Pro-conditioning aid to Israel", "Keep Nine", "Pro-strategic clarity", "Pro-peace deal"]) {
      for (const prompt of [buildScorerPrompt(), renderFramework(), decisions]) expect(prompt, name).not.toContain(name);
    }
  });

  it("gives a political leaning only for US claims (C1, P3)", () => {
    expect(RULES.find((r) => r.id === "C1")?.text).toMatch(/only for claims about the United States/);
    expect(PUBLISH_RULES.find((r) => r.id === "P3")?.name).toBe("United States");
  });
});
