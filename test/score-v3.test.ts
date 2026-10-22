import { describe, expect, it } from "vitest";
import { parseDecision } from "../src/agent/v3/decisions.js";
import {
  compareWithIndependent,
  decideLeaning,
  displayLabel,
  evidenceFound,
  resolveIdeologies,
  scoreConfidence,
  type ScorerOutput,
} from "../src/agent/v3/score.js";

const claim = "The government should increase taxes on the wealthiest citizens to fund public healthcare";
const out = (over: Partial<ScorerOutput> = {}): ScorerOutput => ({
  gate: { G1: true, G2: true, G3: true, G4: true },
  gate_note: "",
  country: "United States",
  hedged: false,
  matches: [{ criterion: "ECO-1L", strength: "direct", evidence: "increase taxes on the wealthiest citizens" }],
  cross_cutting: [],
  ideologies: [],
  reasoning: "",
  ...over,
});

describe("evidenceFound", () => {
  it("accepts exact words regardless of case, quotes and spacing", () => {
    expect(evidenceFound(claim, "Increase  taxes on the wealthiest")).toBe(true);
    expect(evidenceFound("Women’s rights matter", "women's rights")).toBe(true);
  });
  it("rejects words that are not in the claim", () => {
    expect(evidenceFound(claim, "abolish private property")).toBe(false);
    expect(evidenceFound(claim, "")).toBe(false);
  });
});

describe("decideLeaning", () => {
  it("maps one criterion to its leaning", () => {
    const { decision } = decideLeaning(out(), claim);
    expect(decision).toEqual({ kind: "leaning", score: -1, leaning: "Center left" });
  });

  it("returns No political position with the first failed check", () => {
    const { decision } = decideLeaning(out({ gate: { G1: true, G2: false, G3: false, G4: true } }), claim);
    expect(decision).toEqual({ kind: "no_position", failedCheck: "G2", reason: "attributed" });
  });

  it("drops criteria whose evidence is not in the claim", () => {
    const { decision, flags } = decideLeaning(out({ matches: [{ criterion: "ECO-3L", strength: "direct", evidence: "abolish capitalism" }] }), claim);
    expect(decision).toEqual({ kind: "uncertain", reason: "no criterion matched" });
    expect(flags.join()).toMatch(/ECO-3L dropped/);
  });

  it("gives Uncertain for topic areas pointing in opposite directions (A1)", () => {
    const text = "Taxes on the rich should rise and abortion should be banned";
    const { decision } = decideLeaning(
      out({
        matches: [
          { criterion: "ECO-1L", strength: "direct", evidence: "Taxes on the rich should rise" },
          { criterion: "SOC-2R", strength: "direct", evidence: "abortion should be banned" },
        ],
      }),
      text,
    );
    expect(decision).toEqual({ kind: "uncertain", reason: "mixed signals" });
  });

  it("averages same-direction areas and rounds toward the center (A2)", () => {
    const text = "Abolish private schools and raise the minimum wage";
    const { decision } = decideLeaning(
      out({
        matches: [
          { criterion: "ECO-2L", strength: "direct", evidence: "Abolish private schools" },
          { criterion: "ECO-1L", strength: "close", evidence: "raise the minimum wage" },
        ],
      }),
      text,
    );
    // Same topic area: the strongest match wins (direct ECO-2L).
    expect(decision).toEqual({ kind: "leaning", score: -2, leaning: "Left" });

    const two = decideLeaning(
      out({
        matches: [
          { criterion: "ECO-2L", strength: "direct", evidence: "Abolish private schools" },
          { criterion: "LAW-1L", strength: "direct", evidence: "raise the minimum wage" },
        ],
      }),
      text,
    );
    expect(two.decision).toEqual({ kind: "leaning", score: -1, leaning: "Center left" });
  });

  it("caps hedged claims at ±1 (H1) and never reaches Far without a ±3 criterion", () => {
    const text = "There should be a maximum legal income";
    const hedged = decideLeaning(out({ hedged: true, matches: [{ criterion: "ECO-3L", strength: "direct", evidence: "maximum legal income" }] }), text);
    expect(hedged.decision).toEqual({ kind: "leaning", score: -1, leaning: "Center left" });
    const plain = decideLeaning(out({ matches: [{ criterion: "ECO-3L", strength: "direct", evidence: "maximum legal income" }] }), text);
    expect(plain.decision).toEqual({ kind: "leaning", score: -3, leaning: "Far left" });
  });

  it("gives Center only through a Center criterion, and Uncertain for cross-cutting claims", () => {
    const text = "Immigration reform should pair stronger border security with a path to citizenship";
    const center = decideLeaning(out({ matches: [{ criterion: "NAT-0", strength: "direct", evidence: "pair stronger border security with a path to citizenship" }] }), text);
    expect(center.decision).toEqual({ kind: "leaning", score: 0, leaning: "Center" });
    const cross = decideLeaning(out({ matches: [], cross_cutting: ["X-FOR"] }), "The US should stop policing the world");
    expect(cross.decision).toEqual({ kind: "uncertain", reason: "cross-cutting" });
  });
});

describe("compareWithIndependent (A5)", () => {
  const dist = (top: string, p = 0.9) =>
    Object.fromEntries(["Far left", "Left", "Center left", "Center", "Center right", "Right", "Far right"].map((l) => [l, l === top ? p : (1 - p) / 6])) as never;
  it("measures steps and sides against the most likely independent leaning", () => {
    expect(compareWithIndependent("Center left", dist("Left"))).toMatchObject({ top: "Left", steps: 1, oppositeSides: false });
    expect(compareWithIndependent("Far left", dist("Center left"))).toMatchObject({ steps: 2, oppositeSides: false });
    expect(compareWithIndependent("Center left", dist("Center right"))).toMatchObject({ steps: 2, oppositeSides: true });
    expect(compareWithIndependent("Right", dist("Right"))).toMatchObject({ steps: 0 });
  });
});

describe("scoreConfidence", () => {
  it("adds the documented parts", () => {
    const c = scoreConfidence({ hedged: false, weakestStrength: "direct", pStance: 0.99, pLeaning: 0.9, verifierAgrees: true });
    expect(c.components).toEqual({ explicitness: 25, match: 25, probability: 27, verifier: 20 });
    expect(c.total).toBe(97);
    expect(c.band).toBe("High");
  });

  it("drops to Medium or Low as signals weaken", () => {
    expect(scoreConfidence({ hedged: true, weakestStrength: "close", pStance: 0.9, pLeaning: 0.6, verifierAgrees: true }).band).toBe("Medium");
    expect(scoreConfidence({ hedged: false, weakestStrength: "direct", pStance: 0.9, pLeaning: 0.9, verifierAgrees: false }).band).toBe("Medium");
    expect(scoreConfidence({ hedged: true, weakestStrength: "partial", pStance: 0.9, pLeaning: 0.3, verifierAgrees: false }).band).toBe("Low");
  });

  it("is zero when the independent check says the claim takes no position", () => {
    expect(scoreConfidence({ hedged: false, weakestStrength: "direct", pStance: 0.2, pLeaning: 1, verifierAgrees: true }).total).toBe(0);
  });
});

describe("resolveIdeologies", () => {
  const text = "Workers should be entitled to company board seats";
  it("gives Potential for a shared belief, with the alternatives", () => {
    const { assigned } = resolveIdeologies([{ name: "Social democrat", tenet: "T2", evidence: "company board seats" }], text, { "Social democrat": 0.9 }, "Left");
    expect(assigned[0]).toMatchObject({ name: "Social democrat", qualifier: "Potential", alternatives: ["Democratic socialist", "Liberal", "Progressive"] });
  });

  it("gives Clear only for a distinctive belief with probability ≥ 0.8 at a typical leaning", () => {
    const t = "There should be a maximum legal income";
    expect(resolveIdeologies([{ name: "Socialist", tenet: "T1", evidence: "maximum legal income" }], t, { Socialist: 0.93 }, "Far left").assigned[0]!.qualifier).toBe("Clear");
    expect(resolveIdeologies([{ name: "Socialist", tenet: "T1", evidence: "maximum legal income" }], t, { Socialist: 0.93 }, "Center right").assigned[0]!.qualifier).toBe("Potential");
  });

  it("drops ideologies with low probability, missing evidence or an unknown belief", () => {
    const { assigned, dropped } = resolveIdeologies(
      [
        { name: "Socialist", tenet: "T1", evidence: "board seats" },
        { name: "Marxist", tenet: "T3", evidence: "board seats" },
      ],
      text,
      { Socialist: 0.3, Marxist: 0.9 },
      "Left",
    );
    expect(assigned).toEqual([]);
    expect(dropped.map((d) => d.reason)).toEqual([expect.stringMatching(/below 0.5/), expect.stringMatching(/does not exist/)]);
  });
});

describe("parseDecision", () => {
  it("maps answers back to named signals and records refusals", () => {
    const s = parseDecision([
      { type: "predicate", name: "stance", probability: 0.97 },
      {
        type: "score",
        name: "leaning",
        score: 1.2,
        confidence: 0.7,
        probabilities: [
          { value: 0, label: "Far left", probability: 0.1 },
          { value: 1, label: "Left", probability: 0.6 },
          { value: 2, label: "Center left", probability: 0.3 },
        ],
      },
      { type: "predicate", name: "ideology_0", probability: 0.4 },
      { type: "refusal", name: "ideology_1" },
    ]);
    expect(s.pStance).toBe(0.97);
    expect(s.leaning.Left).toBe(0.6);
    expect(s.leaning.Right).toBe(0);
    expect(s.ideologies.Anarchist).toBe(0.4);
    expect(s.refusals).toEqual(["ideology_1"]);
  });
});

describe("displayLabel", () => {
  it("follows Armando's 'Potentially …' style and keeps acronyms", () => {
    expect(displayLabel("Center left", "Clear")).toBe("Center left");
    expect(displayLabel("Center left", "Potential")).toBe("Potentially center left");
    expect(displayLabel("MAGA", "Potential")).toBe("Potentially MAGA");
  });
});
