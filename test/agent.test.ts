import type OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { ScoringAgent } from "../src/agent/v3/agent.js";
import type { ScorerOutput } from "../src/agent/v3/score.js";
import { IDEOLOGY_CARDS, POLITICAL_LEANING_VALUES } from "../src/framework/ideologies.js";
import { LEANINGS_LEFT_TO_RIGHT, type LeaningName } from "../src/framework/rubric.js";
import type { Claim } from "../src/geo/claims.js";
import { buildTaxonomy } from "../src/geo/taxonomy.js";
import { RunState } from "../src/pipeline/state.js";

// A stub OpenAI client: the scorer answers from a queue (run 1, then runs 2 and 3), the independent
// check from fixed probabilities, the verifier and second looks from callbacks. It counts every call.

interface StubOptions {
  /** Scorer answers in call order: run 1, run 2, run 3 (the last one repeats). */
  scorer: ScorerOutput[];
  stance?: number;
  leaning?: Partial<Record<LeaningName, number>>;
  ideologies?: Record<string, number>;
  /** Leanings whose question the independent check refuses, every time it is asked. */
  refuse?: string[];
  /** The verifier's verdict on each ideological leaning; agree when not listed. */
  verdicts?: Record<string, "agree" | "disagree">;
  leaningVerdict?: "agree" | "disagree";
  /** Second looks that find a match: card name → evidence. */
  secondLooks?: Record<string, string>;
}

function stub(o: StubOptions) {
  const calls = { scorer: 0, verifier: 0, secondLook: 0, decisions: 0, secondLookCards: [] as string[] };
  const reply = (value: unknown) => ({ choices: [{ message: { content: JSON.stringify(value), refusal: null }, finish_reason: "stop" }] });
  const client = {
    chat: {
      completions: {
        create: async (req: { messages: { role: string; content: string }[]; response_format: { json_schema: { name: string } } }) => {
          const kind = req.response_format.json_schema.name;
          if (kind === "scoring") return reply(o.scorer[Math.min(calls.scorer++, o.scorer.length - 1)]);
          if (kind === "second_look") {
            calls.secondLook++;
            const card = /takes the side "([^"]+)"/.exec(req.messages[0]!.content)![1]!;
            calls.secondLookCards.push(card);
            const evidence = o.secondLooks?.[card];
            return reply(evidence ? { matches: true, tenet: "T1", evidence, reason: "" } : { matches: false, tenet: "none", evidence: "", reason: "no match" });
          }
          if (kind === "verdict") {
            calls.verifier++;
            const proposed = JSON.parse(req.messages[1]!.content).proposed_result as { leaning: string | null; ideologies: { name: string }[] };
            return reply({
              leaning: proposed.leaning ? { verdict: o.leaningVerdict ?? "agree", problems: "" } : { verdict: "not_applicable", problems: "" },
              ideologies: proposed.ideologies.map((i) => ({ name: i.name, verdict: o.verdicts?.[i.name] ?? "agree", problems: o.verdicts?.[i.name] === "disagree" ? "doubtful" : "" })),
            });
          }
          throw new Error(`unexpected request ${kind}`);
        },
      },
    },
    decisions: {
      create: async (req: { questions: { name: string }[] }) => {
        calls.decisions++;
        return {
          answers: req.questions.map((q) => {
            if (q.name === "stance") return { type: "predicate", name: q.name, probability: o.stance ?? 0.97 };
            if (q.name === "leaning") {
              const dist = o.leaning ?? {};
              return {
                type: "score",
                name: q.name,
                score: 3,
                confidence: 0.9,
                probabilities: LEANINGS_LEFT_TO_RIGHT.map((label, value) => ({ value, label, probability: dist[label] ?? 0.01 })),
              };
            }
            const card = IDEOLOGY_CARDS[Number(q.name.slice("ideology_".length))]!;
            if (o.refuse?.includes(card.name)) return { type: "refusal", name: q.name };
            return { type: "predicate", name: q.name, probability: o.ideologies?.[card.name] ?? 0.01 };
          }),
        };
      },
    },
  };
  return { client: client as unknown as OpenAI, calls };
}

const geoValues = (kind: "tradition" | "issue") =>
  IDEOLOGY_CARDS.filter((c) => c.kind === kind).map((c) => ({ id: c.geoId!, name: c.name, description: c.definition }));
const taxonomy = buildTaxonomy(
  POLITICAL_LEANING_VALUES.filter((v) => v.geoId).map((v) => ({ id: v.geoId!, name: v.name, description: null })),
  geoValues("tradition"),
  geoValues("issue"),
  new Set(),
);

const claim = (text: string, id = "c1"): Claim => ({ id, text, spaceIds: ["4582fbbee28a16589154f7e36f1ee3c5"], isFactual: null, context: {}, leaningIds: [] });

const scorer = (over: Partial<ScorerOutput> = {}): ScorerOutput => ({
  gate: { G1: true, G2: true, G3: true, G4: true },
  gate_note: "",
  country: "United States",
  hedged: false,
  matches: [{ criterion: "SOC-2R", strength: "direct", evidence: "Abortion should be banned" }],
  cross_cutting: [],
  ideologies: [{ name: "Pro-life", tenet: "T1", evidence: "Abortion should be banned" }],
  reasoning: "",
  ...over,
});

const ABORTION = "Abortion should be banned";
const clearRight: Omit<StubOptions, "scorer"> = { leaning: { Right: 0.9 }, ideologies: { "Pro-life": 0.97, "Pro-choice": 0.01 } };

const agent = (o: StubOptions, state = new RunState(":memory:")) => {
  const { client, calls } = stub(o);
  return { agent: new ScoringAgent(taxonomy, state, { client, model: "stub" }), calls, state };
};

describe("ScoringAgent.score", () => {
  it("publishes a clear US claim after 3 scorer runs, 1 independent check and 2 verifier checks", async () => {
    const { agent: a, calls } = agent({ scorer: [scorer()], ...clearRight });
    const r = await a.score(claim(ABORTION));
    expect(r.leaning).toBe("Right");
    expect(r.ideologies.map((i) => i.name)).toEqual(["Pro-life"]);
    expect(calls).toMatchObject({ scorer: 3, decisions: 1, verifier: 2 });
  });

  it("does not publish when an extra run reached the same leaning only through a partial match (P6 like for like)", async () => {
    const partial = scorer({ matches: [{ criterion: "SOC-2R", strength: "partial", evidence: "Abortion should be banned" }] });
    const { agent: a } = agent({ scorer: [scorer(), partial, scorer()], ...clearRight });
    const r = await a.score(claim(ABORTION));
    expect(r.leaning).toBeNull();
    expect(r.checks.find((c) => c.id === "P6")).toMatchObject({ pass: false, detail: "2 of 3 runs gave Right; the others gave Right, but only a partial match" });
  });

  it("gives the same result whichever run comes first", async () => {
    const partial = scorer({ matches: [{ criterion: "SOC-2R", strength: "partial", evidence: "Abortion should be banned" }] });
    const first = await agent({ scorer: [partial, scorer(), scorer()], ...clearRight }).agent.score(claim(ABORTION));
    const second = await agent({ scorer: [scorer(), partial, scorer()], ...clearRight }).agent.score(claim(ABORTION));
    expect(first.leaning).toBeNull();
    expect(second.leaning).toBeNull();
  });

  it("gives a claim about another country or the world no political leaning, but keeps its issue leaning", async () => {
    const { agent: a } = agent({ scorer: [scorer({ country: "Global" })], ...clearRight });
    const r = await a.score(claim(ABORTION));
    expect(r.leaning).toBeNull();
    expect(r.display).toMatch(/^No label \(P3 United States/);
    expect(r.ideologies.map((i) => i.name)).toEqual(["Pro-life"]);
  });

  it("asks a refused question once more, and never treats a refused other side as ruled out", async () => {
    const { agent: a, calls } = agent({ scorer: [scorer({ matches: [] })], ...clearRight, refuse: ["Pro-choice"] });
    const r = await a.score(claim(ABORTION));
    expect(calls.decisions).toBe(2);
    expect(r.ideologies).toEqual([]);
    expect(r.droppedIdeologies).toContainEqual({ name: "Pro-life", reason: "the independent check refused to score the other side: Pro-choice" });
  });

  it("stops at 'signals disagree' without asking the verifier", async () => {
    const { agent: a, calls } = agent({ scorer: [scorer({ gate: { G1: false, G2: true, G3: true, G4: true }, matches: [], ideologies: [] })], stance: 0.6 });
    const r = await a.score(claim(ABORTION));
    expect(r.noLabelReason).toBe("signals disagree");
    expect(calls).toMatchObject({ verifier: 0, scorer: 1 });
  });

  it("reads a second call from the cache, and asks again when the claim text changes", async () => {
    const { agent: a, calls } = agent({ scorer: [scorer()], ...clearRight });
    await a.score(claim(ABORTION));
    const before = { ...calls };
    await a.score(claim(ABORTION));
    expect(calls).toMatchObject({ scorer: before.scorer, decisions: before.decisions, verifier: before.verifier });
    await a.score(claim(`${ABORTION} nationwide`));
    expect(calls.scorer).toBeGreaterThan(before.scorer);
    expect(calls.decisions).toBe(before.decisions + 1);
  });

  it("publishes no tradition on a hedged claim", async () => {
    const text = "Marriage may be the best foundation for raising children";
    const { agent: a } = agent({
      scorer: [scorer({ hedged: true, matches: [], ideologies: [{ name: "Christian conservative", tenet: "T2", evidence: "Marriage may be the best foundation" }] })],
      leaning: { Right: 0.9 },
      ideologies: { "Christian conservative": 0.97 },
    });
    const r = await a.score(claim(text));
    expect(r.ideologies).toEqual([]);
    expect(r.droppedIdeologies.find((d) => d.name === "Christian conservative")?.reason).toMatch(/the claim is hedged/);
  });

  it("publishes no tradition when the verifier rejects the issue side on the same claim", async () => {
    const text = "Same-sex couples should have the same adoption rights as opposite-sex couples";
    const { agent: a } = agent({
      scorer: [
        scorer({
          matches: [],
          ideologies: [
            { name: "Pro-LGBTQ rights", tenet: "T1", evidence: "Same-sex couples should have the same adoption rights" },
            { name: "Progressive", tenet: "T2", evidence: "the same adoption rights" },
          ],
        }),
      ],
      leaning: { Left: 0.9 },
      ideologies: { "Pro-LGBTQ rights": 0.97, Progressive: 0.95 },
      verdicts: { "Pro-LGBTQ rights": "disagree" },
    });
    const r = await a.score(claim(text));
    expect(r.ideologies).toEqual([]);
    expect(r.droppedIdeologies.find((d) => d.name === "Progressive")?.reason).toMatch(/in doubt: Pro-LGBTQ rights \(the verifier rejected it\)/);
  });

  it("needs 0.9 for a tradition with nothing else published, and 0.8 next to a published issue leaning", async () => {
    const text = "Taxes are theft";
    const out = scorer({ matches: [], cross_cutting: ["X-FOR"], ideologies: [{ name: "Libertarian", tenet: "T1", evidence: "Taxes are theft" }] });
    const alone = await agent({ scorer: [out], leaning: { Right: 0.8 }, ideologies: { Libertarian: 0.85 } }).agent.score(claim(text));
    expect(alone.ideologies).toEqual([]);
    expect(alone.nearMisses).toEqual(["Libertarian: independent probability 0.85 (needs 0.9)"]);
    const strong = await agent({ scorer: [out], leaning: { Right: 0.8 }, ideologies: { Libertarian: 0.93 } }).agent.score(claim(text));
    expect(strong.ideologies.map((i) => i.name)).toEqual(["Libertarian"]);
  });

  it("drops a general side next to a specific one (I6)", async () => {
    const text = "Frontier AI labs should be licensed by a federal agency";
    const { agent: a } = agent({
      scorer: [
        scorer({
          matches: [],
          cross_cutting: ["X-TECH"],
          ideologies: [
            { name: "Pro-AI regulation", tenet: "T1", evidence: "Frontier AI labs should be licensed" },
            { name: "Pro-regulation", tenet: "T1", evidence: "licensed by a federal agency" },
          ],
        }),
      ],
      ideologies: { "Pro-AI regulation": 0.97, "Pro-regulation": 0.95 },
    });
    const r = await a.score(claim(text));
    expect(r.ideologies.map((i) => i.name)).toEqual(["Pro-AI regulation"]);
    expect(r.droppedIdeologies).toContainEqual({ name: "Pro-regulation", reason: "Pro-AI regulation is the more specific issue leaning for this claim (I6)" });
  });

  it("gives a missed issue leaning a second look even when the scorer's own proposals were all invalid, and never a tradition", async () => {
    const invalid = ["Conservative", "Traditionalist", "MAGA", "Populist", "Nationalist"].map((name) => ({ name, tenet: "T1", evidence: "words not in the claim" }));
    const { agent: a, calls } = agent({
      scorer: [scorer({ ideologies: invalid })],
      ...clearRight,
      ideologies: { ...clearRight.ideologies, "Christian conservative": 0.95 },
      secondLooks: { "Pro-life": "Abortion should be banned" },
    });
    const r = await a.score(claim(ABORTION));
    expect(r.ideologies.map((i) => i.name)).toEqual(["Pro-life"]);
    expect(calls.secondLookCards).not.toContain("Christian conservative");
    expect(calls.secondLookCards).toContain("Pro-life");
  });

  it("refuses an empty claim without calling any model", async () => {
    const { agent: a, calls } = agent({ scorer: [scorer()] });
    await expect(a.score(claim("  "))).rejects.toThrow(/no text/);
    expect(calls).toMatchObject({ scorer: 0, decisions: 0, verifier: 0 });
  });
});
