import { describe, expect, it } from "vitest";
import { buildDecisionQuestions, parseDecision } from "../src/agent/v3/decisions.js";
import { buildScorerMessage } from "../src/agent/v3/prompt.js";
import { combineVerdicts } from "../src/agent/v3/verify.js";
import { IDEOLOGY_CARDS } from "../src/framework/ideologies.js";
import { ALIAS_RULE, EFFECT_RULE } from "../src/framework/rubric.js";
import {
  allPass,
  applyOverlapRules,
  checkIdeology,
  checkLeaning,
  compareWithIndependent,
  decideLeaning,
  evidenceFound,
  failedChecks,
  ideologyNearMiss,
  leaningNearMiss,
  quote,
  readyForRepeats,
  resolveIdeologies,
  unverifiedQuotes,
  type IdeologyCandidate,
  type IdeologyGateInput,
  type LeaningGateInput,
  type RepeatLeaning,
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
  it("matches whole words only, never part of a word", () => {
    expect(evidenceFound("Abortion should be legally restricted", "Abortion should be legal")).toBe(false);
    expect(evidenceFound("Abolish the police", "ICE")).toBe(false);
    expect(evidenceFound("Abolish ICE now", "ICE")).toBe(true);
    expect(evidenceFound("Taxes should rise.", "taxes should rise")).toBe(true);
  });
  it("treats dashes, quotes and full-width letters as the same characters", () => {
    expect(evidenceFound("The Israel–Palestine conflict needs a two-state solution", "Israel-Palestine conflict")).toBe(true);
    expect(evidenceFound("Ｂａｎ assault weapons", "ban assault weapons")).toBe(true);
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
    // One topic area at two levels (ECO-2L and ECO-1L): between them, no leaning (A5), whatever the order.
    expect(decision).toEqual({ kind: "uncertain", reason: "between two levels" });
    const reversed = decideLeaning(
      out({
        matches: [
          { criterion: "ECO-1L", strength: "close", evidence: "raise the minimum wage" },
          { criterion: "ECO-2L", strength: "direct", evidence: "Abolish private schools" },
        ],
      }),
      text,
    );
    expect(reversed.decision).toEqual(decision);

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

  it("keeps the strongest of two matches at the same level of one topic area", () => {
    const text = "Raise the minimum wage and tax the wealthiest more";
    const { decision, applied } = decideLeaning(
      out({
        matches: [
          { criterion: "ECO-1L", strength: "close", evidence: "Raise the minimum wage" },
          { criterion: "ECO-1L", strength: "direct", evidence: "tax the wealthiest more" },
        ],
      }),
      text,
    );
    expect(decision).toEqual({ kind: "leaning", score: -1, leaning: "Center left" });
    expect(applied.map((a) => a.strength)).toEqual(["direct"]);
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

const run = (leaning: RepeatLeaning["leaning"], over: Partial<RepeatLeaning> = {}): RepeatLeaning => ({
  leaning,
  weakestStrength: leaning ? "direct" : null,
  hedged: false,
  country: "United States",
  ...over,
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
    repeats: [run("Right"), run("Right")],
  };
  const failing = (over: Partial<LeaningGateInput>) => failedChecks(checkLeaning({ ...ok, ...over })).map((c) => c.id);

  it("publishes only when every rule passes", () => {
    expect(allPass(checkLeaning(ok))).toBe(true);
    expect(failing({})).toEqual([]);
  });

  it("lists a near miss only when P1 or P4 alone fell short by less than 0.1", () => {
    const near = (over: Partial<LeaningGateInput>) => leaningNearMiss({ ...ok, ...over }, checkLeaning({ ...ok, ...over }));
    expect(near({ pStance: 0.72, repeats: null })).toBe("Right: takes a position 0.72 (needs 0.8) (extra runs not made)");
    expect(near({ independent: dist("Right", 0.65) })).toBe("Right: the independent check gives Right 0.65 (needs 0.7)");
    expect(near({})).toBeNull();
    expect(near({ pStance: 0.6 })).toBeNull();
    expect(near({ independent: dist("Left", 0.9) })).toBeNull();
    expect(near({ pStance: 0.75, verifierAgrees: false })).toBeNull();
  });

  it("blocks on each rule by itself", () => {
    expect(failing({ pStance: 0.79 })).toEqual(["P1"]);
    expect(failing({ weakestStrength: "partial" })).toEqual(["P2"]);
    expect(failing({ hedged: true })).toEqual(["P2"]);
    expect(failing({ country: null })).toEqual(["P3"]);
    expect(failing({ independent: dist("Center right", 0.9) })).toEqual(["P4"]);
    expect(failing({ independent: dist("Right", 0.6) })).toEqual(["P4"]);
    expect(failing({ verifierAgrees: false })).toEqual(["P5"]);
    expect(failing({ repeats: [run("Right"), run("Center right")] })).toEqual(["P6"]);
    expect(failing({ repeats: [run("Right"), run(null)] })).toEqual(["P6"]);
  });

  it("gives a political leaning only for claims about the United States (P3, rule C1)", () => {
    for (const country of ["United States", "USA", "U.S.", " united states of america "]) expect(failing({ country })).toEqual([]);
    for (const country of ["Global", "United Kingdom", "Europe", "", null]) expect(failing({ country })).toEqual(["P3"]);
    const detail = (country: string | null) => checkLeaning({ ...ok, country }).find((c) => c.id === "P3")!.detail;
    expect(detail("United States")).toBe("country: United States");
    expect(detail("Global")).toBe("the claim is not about United States politics, and political leanings follow US criteria");
    expect(detail(null)).toBe("the claim does not make clear which country's politics it concerns");
  });

  it("counts an extra run as agreeing only when it reached the same leaning the same way (P6)", () => {
    const p6 = (r: RepeatLeaning) => checkLeaning({ ...ok, repeats: [run("Right"), r] }).find((c) => c.id === "P6")!;
    expect(p6(run("Right")).pass).toBe(true);
    expect(p6(run("Right", { hedged: true }))).toMatchObject({ pass: false, detail: "2 of 3 runs gave Right; the others gave Right, but hedged" });
    expect(p6(run("Right", { weakestStrength: "partial" })).pass).toBe(false);
    expect(p6(run("Right", { country: "Global" })).pass).toBe(false);
    expect(p6(run("Right", { country: null })).pass).toBe(false);
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
    refusedSides: [],
    repeats: [true, true],
    hedged: false,
    anchored: true,
    sideInDoubt: null,
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

  it("never treats an other side the independent check refused to score as ruled out", () => {
    expect(fails(issue, { otherSides: { "Pro-choice": 0 }, refusedSides: ["Pro-choice"] })).toEqual([
      "the independent check refused to score the other side: Pro-choice",
    ]);
  });

  it("publishes a tradition next to a published leaning at probability 0.8 and a typical leaning", () => {
    expect(fails(tradition, {})).toEqual([]);
    expect(fails(tradition, {}, { probability: 0.7 })).toEqual([expect.stringMatching(/below 0.8$/)]);
    expect(fails(tradition, { leaning: "Left" })).toEqual(["it is not usually found at Left"]);
  });

  it("needs 0.9 for a tradition published on its own", () => {
    expect(fails(tradition, { anchored: false })).toEqual(["independent probability 0.84 is below 0.9 (no issue leaning or political leaning is published with it)"]);
    expect(fails(tradition, { anchored: false }, { probability: 0.93 })).toEqual([]);
  });

  it("never publishes a tradition on a hedged claim or when an issue side on the claim is in doubt", () => {
    expect(fails(tradition, { hedged: true })).toEqual(["the claim is hedged"]);
    expect(fails(tradition, { sideInDoubt: "Pro-LGBTQ rights (the verifier rejected it)" })).toEqual([
      "the issue side it rests on is in doubt: Pro-LGBTQ rights (the verifier rejected it)",
    ]);
    // Neither applies to issue leanings: their own side is checked directly.
    expect(fails(issue, { hedged: true, sideInDoubt: "x" })).toEqual([]);
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

  const near = (base: IdeologyGateInput, over: Partial<IdeologyGateInput>, candidate: Partial<IdeologyGateInput["candidate"]> = {}) =>
    ideologyNearMiss({ ...base, ...over, candidate: { ...base.candidate, ...candidate } });

  it("lists a near miss when only a number falls short, by less than 0.1", () => {
    expect(near(issue, {}, { probability: 0.88 })).toBe("Pro-life: independent probability 0.88 (needs 0.9)");
    expect(near(issue, { otherSides: { "Pro-choice": 0.18 } })).toBe("Pro-life: other side Pro-choice 0.18 (limit 0.1)");
    expect(near(tradition, { pStance: 0.79, repeats: null })).toBe("Christian conservative: takes a position 0.79 (needs 0.8) (extra runs not made)");
    expect(near(tradition, {}, { probability: 0.7 })).toBe("Christian conservative: independent probability 0.70 (needs 0.8)");
    expect(near(tradition, { anchored: false })).toBe("Christian conservative: independent probability 0.84 (needs 0.9)");
  });

  it("is not a near miss when it passed, missed by more, or failed a judgement", () => {
    expect(near(issue, {})).toBeNull();
    expect(near(issue, {}, { probability: 0.79 })).toBeNull();
    expect(near(issue, { otherSides: { "Pro-choice": 0.3 } })).toBeNull();
    expect(near(issue, { verifierAgrees: false }, { probability: 0.88 })).toBeNull();
    expect(near(issue, { repeats: [true, false] }, { probability: 0.88 })).toBeNull();
    expect(near(tradition, { leaning: "Left" }, { probability: 0.75 })).toBeNull();
    expect(near(issue, { refusedSides: ["Pro-choice"] }, { probability: 0.88 })).toBeNull();
    expect(near(tradition, { hedged: true }, { probability: 0.75 })).toBeNull();
    expect(near(tradition, { sideInDoubt: "x" }, { probability: 0.75 })).toBeNull();
  });
});

describe("applyOverlapRules (I6)", () => {
  const cand = (name: string, kind: "issue" | "tradition", issue: string | null, probability = 0.95): IdeologyCandidate => ({
    name,
    kind,
    issue,
    tenet: "T1",
    tenetText: "",
    evidence: "x",
    probability,
  });
  const names = (r: { kept: IdeologyCandidate[] }) => r.kept.map((c) => c.name);

  it("drops a general side next to a specific issue leaning (I6)", () => {
    const r = applyOverlapRules([cand("Pro-AI regulation", "issue", "AI"), cand("Pro-regulation", "issue", "Regulation")]);
    expect(names(r)).toEqual(["Pro-AI regulation"]);
    expect(r.dropped).toEqual([{ name: "Pro-regulation", reason: "Pro-AI regulation is the more specific issue leaning for this claim (I6)" }]);
  });

  it("keeps a general side when it is the only issue leaning", () => {
    expect(names(applyOverlapRules([cand("Pro-regulation", "issue", "Regulation"), cand("Progressive", "tradition", null)]))).toEqual(["Pro-regulation", "Progressive"]);
  });

  it("never drops a tradition for being next to an issue leaning", () => {
    expect(names(applyOverlapRules([cand("Pro-gun rights", "issue", "Guns"), cand("Libertarian", "tradition", null)]))).toEqual(["Pro-gun rights", "Libertarian"]);
  });
});

describe("combineVerdicts (verifier asked twice)", () => {
  const agree = { verdict: "agree" as const, problems: "" };
  const no = (problems: string) => ({ verdict: "disagree" as const, problems });
  it("agrees only when every check agrees, and keeps every objection", () => {
    const v = combineVerdicts([
      { leaning: agree, ideologies: [{ name: "Pro-life", ...agree }, { name: "Conservative", ...agree }] },
      { leaning: no("between two levels"), ideologies: [{ name: "Pro-life", ...agree }, { name: "Conservative", ...no("too broad") }] },
    ]);
    expect(v.leaning).toEqual(no("between two levels"));
    expect(v.ideologies).toEqual([{ name: "Pro-life", ...agree }, { name: "Conservative", ...no("too broad") }]);
  });
  it("treats a part one check did not assess as not approved", () => {
    const v = combineVerdicts([
      { leaning: null, ideologies: [{ name: "Pro-life", ...agree }] },
      { leaning: null, ideologies: [] },
    ]);
    expect(v.leaning).toBeNull();
    expect(v.ideologies).toEqual([{ name: "Pro-life", ...no("the verifier did not assess it") }]);
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

describe("buildDecisionQuestions", () => {
  const questions = buildDecisionQuestions({ politicalLeanings: [], ideologies: [], fingerprint: "test", byName: new Map() });
  const instructionsFor = (name: string) => {
    const q = questions[2 + IDEOLOGY_CARDS.findIndex((c) => c.name === name)];
    return q && "instructions" in q ? q.instructions : "";
  };

  it("gives the independent check Armando's alternative names for each side of an issue", () => {
    expect(instructionsFor("Pro-foreign aid reform")).toContain("Also called: Pro-foreign aid cuts;");
    expect(instructionsFor("Pro-internet freedom")).toContain("Pro-free speech");
  });
  it("says the names never widen a side (rule I7), and leaves out names that contradict it", () => {
    expect(instructionsFor("Gender-critical")).toContain(ALIAS_RULE);
    expect(instructionsFor("Pro-Russia")).not.toContain("Pro-negotiated settlement");
    expect(instructionsFor("Pro-Russia")).toContain("Ukraine skeptic");
  });
  it("lists each check's failing cases in the position question, and assumes no country", () => {
    const stance = "instructions" in questions[0]! ? questions[0].instructions : "";
    expect(stance).toContain("Not: Neutral descriptions");
    const leaning = "instructions" in questions[1]! ? questions[1].instructions : "";
    expect(leaning).not.toMatch(/if unclear/);
  });
  it("counts a side argued through its effects (rule E2) in the position, issue and tradition questions", () => {
    expect("instructions" in questions[0]! && questions[0].instructions).toContain(EFFECT_RULE);
    expect(instructionsFor("Pro-wage flexibility")).toContain("directly or by asserting an effect that this side uses as its argument");
    // The full E2 text lowered the probability of clear sides when appended to every issue question (v3.4 A/B).
    expect(instructionsFor("Pro-wage flexibility")).not.toContain(EFFECT_RULE);
    expect(instructionsFor("Libertarian")).toContain(EFFECT_RULE);
  });
  it("still describes the other side of the issue", () => {
    expect(instructionsFor("Pro-life")).toContain("The other side: Pro-choice:");
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
    expect(s.unansweredIdeologies).toEqual([IDEOLOGY_CARDS[1]!.name]);
  });

  it("counts a question with no answer as refused, and rejects answers to questions never asked", () => {
    const s = parseDecision([{ type: "predicate", name: "stance", probability: 0.9 }], ["stance", "leaning", "ideology_0"]);
    expect(s.refusals).toEqual(["leaning", "ideology_0"]);
    expect(s.unansweredIdeologies).toEqual([IDEOLOGY_CARDS[0]!.name]);
    expect(() => parseDecision([{ type: "predicate", name: "ideology_999", probability: 0.9 }], ["stance"])).toThrow(/not asked/);
  });
});
