import { describe, expect, it } from "vitest";
import { parseDecision } from "../src/agent/v3/decisions.js";
import { buildScorerMessage } from "../src/agent/v3/prompt.js";
import { IDEOLOGY_CARDS } from "../src/framework/ideologies.js";
import {
  allPass,
  checkIdeology,
  checkLeaning,
  compareWithIndependent,
  decideLeaning,
  evidenceFound,
  failedChecks,
  quote,
  readyForRepeats,
  resolveIdeologies,
  unverifiedQuotes,
  type IdeologyGateInput,
  type LeaningGateInput,
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

describe("checkLeaning (publish rules P1–P6)", () => {
  const dist = (top: string, p: number) =>
    Object.fromEntries(["Far left", "Left", "Center left", "Center", "Center right", "Right", "Far right"].map((l) => [l, l === top ? p : (1 - p) / 6])) as never;
  const ok: LeaningGateInput = {
    leaning: "Right",
    pStance: 0.97,
    weakestStrength: "direct",
    hedged: false,
    country: "United States",
    independent: dist("Right", 0.9),
    verifierAgrees: true,
    repeats: ["Right", "Right"],
  };
  const failing = (over: Partial<LeaningGateInput>) => failedChecks(checkLeaning({ ...ok, ...over })).map((c) => c.id);

  it("publishes only when every rule passes", () => {
    expect(allPass(checkLeaning(ok))).toBe(true);
    expect(failing({})).toEqual([]);
  });

  it("blocks on each rule by itself", () => {
    expect(failing({ pStance: 0.79 })).toEqual(["P1"]);
    expect(failing({ weakestStrength: "partial" })).toEqual(["P2"]);
    expect(failing({ hedged: true })).toEqual(["P2"]);
    expect(failing({ country: null })).toEqual(["P3"]);
    expect(failing({ independent: dist("Center right", 0.9) })).toEqual(["P4"]);
    expect(failing({ independent: dist("Right", 0.6) })).toEqual(["P4"]);
    expect(failing({ verifierAgrees: false })).toEqual(["P5"]);
    expect(failing({ repeats: ["Right", "Center right"] })).toEqual(["P6"]);
    expect(failing({ repeats: ["Right", null] })).toEqual(["P6"]);
  });

  it("an independent check one level away blocks, as in run-1's wrong 'Potentially' labels", () => {
    const c = checkLeaning({ ...ok, leaning: "Far right", independent: { ...(dist("Right", 0.92) as Record<string, number>), "Far right": 0 } as never });
    expect(c.find((x) => x.id === "P4")).toMatchObject({ pass: false, detail: "the independent check prefers Right (0.92); Far right gets 0.00" });
  });

  it("asks for the extra runs only when P1–P5 pass, and never publishes without them", () => {
    const before = checkLeaning({ ...ok, repeats: null });
    expect(readyForRepeats(before)).toBe(true);
    expect(allPass(before)).toBe(false);
    expect(failedChecks(before)).toEqual([]); // the skipped P6 is not reported as a failure
    expect(readyForRepeats(checkLeaning({ ...ok, verifierAgrees: false, repeats: null }))).toBe(false);
    expect(allPass([])).toBe(false);
  });
});

describe("resolveIdeologies", () => {
  const text = "Abortion is murder and should be banned";
  it("keeps proposals whose position exists and whose evidence is in the claim", () => {
    const { candidates } = resolveIdeologies([{ name: "Pro-life", tenet: "T1", evidence: "Abortion is murder" }], text, { "Pro-life": 0.97 });
    expect(candidates[0]).toMatchObject({ name: "Pro-life", kind: "issue", issue: "Abortion", tenet: "T1", probability: 0.97 });
  });

  it("drops missing evidence and unknown positions", () => {
    const { candidates, dropped } = resolveIdeologies(
      [
        { name: "Socialist", tenet: "T1", evidence: "abolish markets" },
        { name: "Pro-choice", tenet: "T3", evidence: "Abortion is murder" },
      ],
      text,
      {},
    );
    expect(candidates).toEqual([]);
    expect(dropped.map((d) => d.reason)).toEqual([expect.stringMatching(/not in the claim/), expect.stringMatching(/does not exist/)]);
  });

  it("allows several ideological leanings, up to 5 (I4)", () => {
    const names = ["Pro-life", "Social conservative", "Christian conservative", "Conservative", "Traditionalist", "MAGA"];
    const { candidates, dropped } = resolveIdeologies(names.map((name) => ({ name, tenet: "T1", evidence: "Abortion is murder" })), text, {});
    expect(candidates.map((c) => c.name)).toEqual(names.slice(0, 5));
    expect(dropped).toEqual([{ name: "MAGA", reason: expect.stringMatching(/more than 5/) }]);
  });
});

describe("checkIdeology (I3)", () => {
  const issue: IdeologyGateInput = {
    candidate: { name: "Pro-life", kind: "issue", issue: "Abortion", tenet: "T1", tenetText: "", evidence: "Abortion is murder", probability: 0.96 },
    pStance: 0.95,
    leaning: "Right",
    verifierAgrees: true,
    otherSides: { "Pro-choice": 0.02 },
    repeats: [true, true],
  };
  const tradition: IdeologyGateInput = {
    ...issue,
    candidate: { name: "Christian conservative", kind: "tradition", issue: null, tenet: "T2", tenetText: "", evidence: "Marriage is the best foundation", probability: 0.84 },
    otherSides: {},
  };
  const fails = (base: IdeologyGateInput, over: Partial<IdeologyGateInput>, candidate: Partial<IdeologyGateInput["candidate"]> = {}) =>
    checkIdeology({ ...base, ...over, candidate: { ...base.candidate, ...candidate } });

  it("publishes an issue leaning when its side is clear and the other side is not", () => {
    expect(fails(issue, {})).toEqual([]);
    expect(fails(issue, {}, { probability: 0.85 })).toEqual([expect.stringMatching(/below 0.9/)]);
    expect(fails(issue, { otherSides: { "Pro-choice": 0.3 } })).toEqual(["the other side of Abortion also scores: Pro-choice 0.30"]);
  });

  it("publishes a tradition by association (Armando's convention) at probability 0.8 and a typical leaning", () => {
    expect(fails(tradition, {})).toEqual([]);
    expect(fails(tradition, {}, { probability: 0.7 })).toEqual([expect.stringMatching(/below 0.8/)]);
    expect(fails(tradition, { leaning: "Left" })).toEqual(["it is not usually found at Left"]);
  });

  it("needs the verifier, a position and stable runs for both kinds", () => {
    for (const base of [issue, tradition]) {
      expect(fails(base, { verifierAgrees: false })).toEqual(["the verifier disagreed"]);
      expect(fails(base, { pStance: 0.5 })).toEqual([expect.stringMatching(/takes a position/)]);
      expect(fails(base, { repeats: [true, false] })).toEqual(["found in 2 of 3 runs"]);
      expect(fails(base, { repeats: null })).toEqual(["extra runs not made"]);
      expect(checkIdeology({ ...base, repeats: null }, false)).toEqual([]);
    }
  });
});

describe("buildScorerMessage", () => {
  it("tells the models which Geo space a claim is in, so its country is clear (P3)", () => {
    const msg = JSON.parse(
      buildScorerMessage({ id: "c", text: "Mail-in voting should be abolished", spaceIds: ["4582fbbee28a16589154f7e36f1ee3c5", "unknown"], isFactual: null, context: {}, leaningIds: [] }),
    );
    expect(msg.geo_spaces).toEqual(["US Politics"]);
  });
});

describe("unverifiedQuotes", () => {
  const claim = "Jamaat Nusrat al-Islam wal-Muslimin (JNIM) seeks to establish Islamic law as the governing system in Mali";
  it("accepts quotes made with the claim's own words", () => {
    expect(unverifiedQuotes(`G1 failed: ${quote("(JNIM) seeks to establish Islamic law")}.`, claim)).toEqual([]);
  });
  it("catches a paraphrase presented as a quote, like run-1's JNIM explanation", () => {
    expect(unverifiedQuotes(`G1 failed: ${quote("JNIM seeks to establish Islamic law")}.`, claim)).toEqual(["JNIM seeks to establish Islamic law"]);
  });
  it("keeps quotes inside the claim's own words checkable", () => {
    const fetterman = 'John Fetterman described socialism as an "anti-American way of life."';
    expect(unverifiedQuotes(quote('an "anti-American way of life."'), fetterman)).toEqual([]);
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
    expect(s.ideologies[IDEOLOGY_CARDS[0]!.name]).toBe(0.4);
    expect(s.refusals).toEqual(["ideology_1"]);
  });
});
