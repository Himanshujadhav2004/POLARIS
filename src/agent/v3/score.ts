import { CARD_BY_NAME } from "../../framework/ideologies.js";
import {
  ALL_CRITERIA,
  GENERAL_ISSUES,
  LEANING_BY_SCORE,
  LEANINGS_LEFT_TO_RIGHT,
  PUBLISH,
  PUBLISH_RULES,
  STANCE_GATE,
  type Criterion,
  type GateCheck,
  type LeaningName,
  type PublishRuleId,
  type Score,
} from "../../framework/rubric.js";

/** What the scoring model reports. Everything below turns it into a result, without the model. */
export interface ScorerOutput {
  gate: Record<GateCheck["id"], boolean>;
  gate_note: string;
  country: string | null;
  hedged: boolean;
  matches: { criterion: string; strength: Strength; evidence: string }[];
  cross_cutting: string[];
  ideologies: { name: string; tenet: string; evidence: string }[];
  reasoning: string;
}

export type Strength = "direct" | "close" | "partial";
export type UncertainReason = "mixed signals" | "cross-cutting" | "no criterion matched" | "between two levels";

export interface AppliedCriterion {
  id: string;
  dimension: Criterion["dimension"];
  score: Score;
  /** Score after the hedging rule (H1). */
  appliedScore: Score;
  text: string;
  strength: Strength;
  evidence: string;
}

export type LeaningDecision =
  | { kind: "no_position"; failedCheck: GateCheck["id"]; reason: GateCheck["reason"] }
  | { kind: "uncertain"; reason: UncertainReason }
  | { kind: "leaning"; score: Score; leaning: LeaningName };

const CRITERION_BY_ID = new Map(ALL_CRITERIA.map((c) => [c.id, c]));
const STRENGTH_RANK: Record<Strength, number> = { direct: 3, close: 2, partial: 1 };

const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'.,;:]+|["'.,;:]+$/g, "");

const isWordChar = (ch: string | undefined) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);

/**
 * Rule E1: evidence must be whole words that actually appear in the claim. A quote that starts or ends
 * inside a word does not count: "Abortion should be legal" is not in "Abortion should be legally restricted".
 */
export function evidenceFound(claim: string, quote: string): boolean {
  const q = normalize(quote);
  if (q.length < 3) return false;
  const c = normalize(claim);
  for (let at = c.indexOf(q); at >= 0; at = c.indexOf(q, at + 1)) {
    if (!isWordChar(c[at - 1]) && !isWordChar(c[at + q.length])) return true;
  }
  return false;
}

/** Wraps words from the claim in curly quotes. Published text quotes the claim only through this. */
export const quote = (words: string): string => `“${words.replace(/[“”]/g, '"')}”`;

/** Quoted spans (“…”) in published text that are not word for word in the claim; must be empty. */
export function unverifiedQuotes(text: string, claim: string): string[] {
  return [...text.matchAll(/“([^”]*)”/g)].map((m) => m[1]!).filter((q) => !evidenceFound(claim, q));
}

export const leaningOf = (score: Score): LeaningName => LEANING_BY_SCORE[String(score) as keyof typeof LEANING_BY_SCORE];

/** Steps 1–3 of the framework: position checks, criterion matches, combining rules. */
export function decideLeaning(out: ScorerOutput, claimText: string): { decision: LeaningDecision; applied: AppliedCriterion[]; flags: string[] } {
  const flags: string[] = [];
  const failed = STANCE_GATE.find((g) => !out.gate[g.id]);
  if (failed) return { decision: { kind: "no_position", failedCheck: failed.id, reason: failed.reason }, applied: [], flags };

  // Keep valid matches with real evidence; one per topic area, unless they disagree or sit at two levels.
  const byDimension = new Map<string, AppliedCriterion[]>();
  for (const m of out.matches) {
    const criterion = CRITERION_BY_ID.get(m.criterion);
    if (!criterion) {
      flags.push(`unknown criterion ${m.criterion} ignored`);
      continue;
    }
    if (!evidenceFound(claimText, m.evidence)) {
      flags.push(`${m.criterion} dropped: its evidence is not in the claim`);
      continue;
    }
    const capped = out.hedged && criterion.score !== 0 ? (Math.sign(criterion.score) as Score) : criterion.score;
    const applied: AppliedCriterion = {
      id: criterion.id,
      dimension: criterion.dimension,
      score: criterion.score,
      appliedScore: capped,
      text: criterion.text,
      strength: m.strength,
      evidence: m.evidence,
    };
    byDimension.set(criterion.dimension, [...(byDimension.get(criterion.dimension) ?? []), applied]);
  }
  if (out.hedged) flags.push("hedged wording: scores capped at ±1 (H1)");

  const applied: AppliedCriterion[] = [];
  for (const list of byDimension.values()) {
    if (list.some((a) => a.appliedScore < 0) && list.some((a) => a.appliedScore > 0)) {
      return { decision: { kind: "uncertain", reason: "mixed signals" }, applied: list, flags };
    }
    // A5: one topic area matched at two levels (e.g. ECO-1R and ECO-2R, or ECO-0 and ECO-2R) sits between them.
    if (new Set(list.map((a) => a.appliedScore)).size > 1) {
      return { decision: { kind: "uncertain", reason: "between two levels" }, applied: list, flags };
    }
    applied.push([...list].sort((a, b) => STRENGTH_RANK[b.strength] - STRENGTH_RANK[a.strength])[0]!);
  }

  if (!applied.length) {
    return { decision: { kind: "uncertain", reason: out.cross_cutting.length ? "cross-cutting" : "no criterion matched" }, applied, flags };
  }
  // A1: topic areas pointing in opposite directions.
  if (applied.some((a) => a.appliedScore < 0) && applied.some((a) => a.appliedScore > 0)) {
    return { decision: { kind: "uncertain", reason: "mixed signals" }, applied, flags };
  }
  // A2: average, rounded toward the center. A3/A4 follow because Center and Far need their own criteria.
  const mean = applied.reduce((s, a) => s + a.appliedScore, 0) / applied.length;
  const score = (Math.trunc(mean) || 0) as Score;
  if (score === 0 && !applied.some((a) => a.appliedScore === 0)) {
    return { decision: { kind: "uncertain", reason: "no criterion matched" }, applied, flags };
  }
  return { decision: { kind: "leaning", score, leaning: leaningOf(score) }, applied, flags };
}

/**
 * Rule A5: compares the criteria's leaning with the independent check's most likely leaning.
 * Returns how many steps apart they are and whether they sit on opposite sides of the center.
 */
export function compareWithIndependent(leaning: LeaningName, distribution: Record<LeaningName, number>): { top: LeaningName; pTop: number; steps: number; oppositeSides: boolean } {
  const order = LEANINGS_LEFT_TO_RIGHT;
  const top = [...order].sort((a, b) => distribution[b] - distribution[a])[0]!;
  const i = order.indexOf(leaning) - 3;
  const j = order.indexOf(top) - 3;
  return { top, pTop: distribution[top], steps: Math.abs(i - j), oppositeSides: i * j < 0 };
}

// ---------------------------------------------------------------------------
// Step 5: publish or leave blank (P1–P6).

export interface RuleCheck {
  id: PublishRuleId;
  pass: boolean;
  /** Plain words built by code from the numbers, never by a model. */
  detail: string;
  /** Not evaluated because an earlier rule failed (P6 only). Counts as not passed. */
  skipped?: true;
}

export interface LeaningGateInput {
  leaning: LeaningName;
  /** Decisions API: probability that the claim takes a position. */
  pStance: number;
  /** Weakest strength among the criteria that produced the leaning. */
  weakestStrength: Strength;
  hedged: boolean;
  country: string | null;
  /** Decisions API: probability of each leaning. */
  independent: Record<LeaningName, number>;
  verifierAgrees: boolean;
  /** What each extra scorer run gave; null while the extra runs have not been made. */
  repeats: RepeatLeaning[] | null;
}

/** One extra scorer run, for P6: it agrees only with the same leaning reached the same way (P2, P3). */
export interface RepeatLeaning {
  leaning: LeaningName | null;
  weakestStrength: Strength | null;
  hedged: boolean;
  country: string | null;
}

/**
 * P3: political leanings follow US criteria (the topic areas list US policies), so only claims about the
 * United States get one. Claims about other countries keep their ideological leanings only.
 */
const US_NAMES = new Set(["united states", "united states of america", "us", "u.s.", "usa", "u.s.a.", "america", "the united states"]);
export const isUnitedStates = (country: string | null): boolean => US_NAMES.has((country ?? "").trim().toLowerCase());

const p2 = (n: number) => n.toFixed(2);
export const ruleName = (id: PublishRuleId): string => PUBLISH_RULES.find((r) => r.id === id)!.name;

/** Every publish rule for a leaning. The leaning is published only when all of them pass. */
export function checkLeaning(i: LeaningGateInput): RuleCheck[] {
  const cmp = compareWithIndependent(i.leaning, i.independent);
  const pLeaning = i.independent[i.leaning];
  const checks: RuleCheck[] = [
    {
      id: "P1",
      pass: i.pStance >= PUBLISH.minStance,
      detail: `independent probability that the claim takes a position: ${p2(i.pStance)}${i.pStance >= PUBLISH.minStance ? "" : `, below ${PUBLISH.minStance}`}`,
    },
    {
      id: "P2",
      pass: i.weakestStrength !== "partial" && !i.hedged,
      detail: i.hedged ? "the claim is hedged" : i.weakestStrength === "partial" ? "a criterion matches only in part" : `the criteria match ${i.weakestStrength === "direct" ? "directly" : "closely"}`,
    },
    {
      id: "P3",
      pass: isUnitedStates(i.country),
      // Written by code: the model's country text never reaches the explanation.
      detail: isUnitedStates(i.country)
        ? "country: United States"
        : i.country?.trim()
          ? "the claim is not about United States politics, and political leanings follow US criteria"
          : "the claim does not make clear which country's politics it concerns",
    },
    {
      id: "P4",
      pass: cmp.steps === 0 && pLeaning >= PUBLISH.minLeaning,
      detail:
        cmp.steps !== 0
          ? `the independent check prefers ${cmp.top} (${p2(cmp.pTop)}); ${i.leaning} gets ${p2(pLeaning)}`
          : `the independent check gives ${i.leaning} ${p2(pLeaning)}${pLeaning >= PUBLISH.minLeaning ? "" : `, below ${PUBLISH.minLeaning}`}`,
    },
    { id: "P5", pass: i.verifierAgrees, detail: i.verifierAgrees ? `the verifier agreed in all ${PUBLISH.verifierChecks} checks` : "the verifier disagreed" },
  ];
  checks.push(stability(i.leaning, i.repeats));
  return checks;
}

/** How an extra run differs from run 1, or null when it gives the same leaning in the same way. */
function repeatDiffers(leaning: LeaningName, r: RepeatLeaning): string | null {
  if (r.leaning !== leaning) return r.leaning ?? "no leaning";
  if (r.hedged) return `${leaning}, but hedged`;
  if (r.weakestStrength === "partial") return `${leaning}, but only a partial match`;
  if (!isUnitedStates(r.country)) return `${leaning}, but not clearly about the United States`;
  return null;
}

function stability(leaning: LeaningName, repeats: RepeatLeaning[] | null): RuleCheck {
  if (!repeats) return { id: "P6", pass: false, skipped: true, detail: "extra runs not made, because an earlier rule failed" };
  const others = repeats.map((r) => repeatDiffers(leaning, r)).filter((d): d is string => d !== null);
  const same = repeats.length - others.length + 1;
  return {
    id: "P6",
    pass: same === PUBLISH.runs,
    detail: same === PUBLISH.runs ? `all ${PUBLISH.runs} runs gave ${leaning}` : `${same} of ${PUBLISH.runs} runs gave ${leaning}; the others gave ${others.join(", ")}`,
  };
}

/** P1–P5 pass, so the extra runs for P6 are worth making. */
export const readyForRepeats = (checks: RuleCheck[]): boolean => checks.filter((c) => c.id !== "P6").every((c) => c.pass);
export const allPass = (checks: RuleCheck[]): boolean => checks.length > 0 && checks.every((c) => c.pass);
/** The rules that actually failed (a skipped P6 is left out: an earlier rule already failed). */
export const failedChecks = (checks: RuleCheck[]): RuleCheck[] => checks.filter((c) => !c.pass && !c.skipped);

// ---------------------------------------------------------------------------
// Step 4: ideologies.

export interface IdeologyCandidate {
  name: string;
  kind: "tradition" | "issue";
  /** For issue leanings, the issue. */
  issue: string | null;
  tenet: string;
  tenetText: string;
  evidence: string;
  probability: number;
}

export interface DroppedIdeology {
  name: string;
  reason: string;
}

/** Keeps proposals whose card and position exist and whose evidence is in the claim (E1, I4). */
export function resolveIdeologies(
  proposed: ScorerOutput["ideologies"],
  claimText: string,
  probabilities: Record<string, number>,
): { candidates: IdeologyCandidate[]; dropped: DroppedIdeology[] } {
  const candidates: IdeologyCandidate[] = [];
  const dropped: DroppedIdeology[] = [];
  for (const p of proposed) {
    if (candidates.some((c) => c.name === p.name)) continue;
    const card = CARD_BY_NAME.get(p.name);
    const tenet = card?.tenets.find((t) => t.id === p.tenet);
    if (!card || !tenet) {
      dropped.push({ name: p.name, reason: `position ${p.tenet} does not exist on the card` });
      continue;
    }
    if (!evidenceFound(claimText, p.evidence)) {
      dropped.push({ name: p.name, reason: "its evidence is not in the claim" });
      continue;
    }
    // The cap (I4) counts valid proposals only, so an invalid one never takes a valid one's place.
    if (candidates.length >= PUBLISH.maxIdeologies) {
      dropped.push({ name: p.name, reason: `more than ${PUBLISH.maxIdeologies} ideological leanings proposed (I4)` });
      continue;
    }
    candidates.push({
      name: card.name,
      kind: card.kind,
      issue: card.issue,
      tenet: tenet.id,
      tenetText: tenet.text,
      evidence: p.evidence,
      probability: probabilities[p.name] ?? 0,
    });
  }
  // A repeated proposal that failed before a valid one is not "not published": the valid one stands.
  return { candidates, dropped: dropped.filter((d) => !candidates.some((c) => c.name === d.name)) };
}

export interface IdeologyGateInput {
  candidate: IdeologyCandidate;
  pStance: number;
  /**
   * Where the claim sits: the leaning the criteria point to (published or not), else the independent
   * check's most likely leaning when it is clear (I3); null when neither is known.
   */
  leaning: LeaningName | null;
  verifierAgrees: boolean;
  /** Issue leanings: the independent probability of each other side of the issue. */
  otherSides: Record<string, number>;
  /** Issue leanings: other sides the independent check refused to answer (they could not be ruled out). */
  refusedSides: string[];
  /** Whether each extra run found this leaning too; null while the extra runs have not been made. */
  repeats: boolean[] | null;
  /** Traditions: the claim is hedged (H1). */
  hedged: boolean;
  /** Traditions: an issue leaning or the political leaning is published on this claim. */
  anchored: boolean;
  /** Traditions: why an issue side on this claim is in doubt (another side of its issue also scores), or null. */
  sideInDoubt: string | null;
}

/** Traditions: the bar, 0.8 next to a published issue or political leaning, otherwise 0.9 (I3). */
const traditionBar = (anchored: boolean) => (anchored ? PUBLISH.minTradition : PUBLISH.minTraditionAlone);

/** Rule I3: every reason this ideological leaning cannot be published; empty means publish. */
export function checkIdeology(i: IdeologyGateInput, withRepeats = true): string[] {
  const c = i.candidate;
  const card = CARD_BY_NAME.get(c.name)!;
  const failed: string[] = [];
  if (i.pStance < PUBLISH.minStance) failed.push(`independent probability that the claim takes a position is ${p2(i.pStance)}, below ${PUBLISH.minStance}`);
  if (c.kind === "issue") {
    if (c.probability < PUBLISH.minIssue) failed.push(`independent probability ${p2(c.probability)} is below ${PUBLISH.minIssue}`);
    const rival = Object.entries(i.otherSides).filter(([, p]) => p > PUBLISH.maxOtherSide);
    if (rival.length) failed.push(`the other side of ${c.issue} also scores: ${rival.map(([n, p]) => `${n} ${p2(p)}`).join(", ")}`);
    if (i.refusedSides.length) failed.push(`the independent check refused to score the other side: ${i.refusedSides.join(", ")}`);
  } else {
    const bar = traditionBar(i.anchored);
    if (c.probability < bar) {
      failed.push(`independent probability ${p2(c.probability)} is below ${bar}${i.anchored ? "" : " (no issue leaning or political leaning is published with it)"}`);
    }
    if (i.leaning && !card.typicalLeanings.includes(i.leaning)) failed.push(`it is not usually found at ${i.leaning}`);
    if (i.hedged) failed.push("the claim is hedged");
    if (i.sideInDoubt) failed.push(`the issue side it rests on is in doubt: ${i.sideInDoubt}`);
  }
  if (!i.verifierAgrees) failed.push("the verifier disagreed");
  if (withRepeats) {
    // Missing extra runs only matter when nothing else already blocks it.
    if (!i.repeats) {
      if (!failed.length) failed.push("extra runs not made");
    } else if (!i.repeats.every(Boolean)) failed.push(`found in ${i.repeats.filter(Boolean).length + 1} of ${PUBLISH.runs} runs`);
  }
  return failed;
}

/**
 * After I3, rule I6 specific before general: a general side (Regulation, Spending & deficit, Welfare, Use of
 * force) is not published next to an issue leaning on a specific issue, which already records the position.
 */
export function applyOverlapRules(published: IdeologyCandidate[]): { kept: IdeologyCandidate[]; dropped: DroppedIdeology[] } {
  const dropped: DroppedIdeology[] = [];
  const isGeneral = (c: IdeologyCandidate) => c.kind === "issue" && (GENERAL_ISSUES as readonly string[]).includes(c.issue ?? "");
  const specific = published.find((c) => c.kind === "issue" && !isGeneral(c));
  const kept = published.filter((c) => {
    if (specific && isGeneral(c)) {
      dropped.push({ name: c.name, reason: `${specific.name} is the more specific issue leaning for this claim (I6)` });
      return false;
    }
    return true;
  });
  return { kept, dropped };
}

/** A bar missed by less than this is a near miss: listed for reviewers, never published. */
export const NEAR_MISS_MARGIN = 0.1;
const nearLow = (bar: number) => Math.round((bar - NEAR_MISS_MARGIN) * 100) / 100;
const nearHigh = (bar: number) => Math.round((bar + NEAR_MISS_MARGIN) * 100) / 100;

/**
 * An unpublished ideological leaning the verifier agreed with, blocked only by numbers short of their
 * bars by less than NEAR_MISS_MARGIN. Null when anything else blocked it.
 */
export function ideologyNearMiss(i: IdeologyGateInput): string | null {
  const c = i.candidate;
  if (!i.verifierAgrees || (i.repeats && !i.repeats.every(Boolean))) return null;
  // Judgements, not numbers: a hedged claim, a doubtful side or an unscored other side is no near miss.
  if (i.refusedSides.length || (c.kind === "tradition" && (i.hedged || i.sideInDoubt))) return null;
  const short: string[] = [];
  if (i.pStance < PUBLISH.minStance) {
    if (i.pStance < nearLow(PUBLISH.minStance)) return null;
    short.push(`takes a position ${p2(i.pStance)} (needs ${PUBLISH.minStance})`);
  }
  if (c.kind === "issue") {
    if (c.probability < PUBLISH.minIssue) {
      if (c.probability < nearLow(PUBLISH.minIssue)) return null;
      short.push(`independent probability ${p2(c.probability)} (needs ${PUBLISH.minIssue})`);
    }
    for (const [name, p] of Object.entries(i.otherSides)) {
      if (p <= PUBLISH.maxOtherSide) continue;
      if (p > nearHigh(PUBLISH.maxOtherSide)) return null;
      short.push(`other side ${name} ${p2(p)} (limit ${PUBLISH.maxOtherSide})`);
    }
  } else {
    if (i.leaning && !CARD_BY_NAME.get(c.name)!.typicalLeanings.includes(i.leaning)) return null;
    const bar = traditionBar(i.anchored);
    if (c.probability < bar) {
      if (c.probability < nearLow(bar)) return null;
      short.push(`independent probability ${p2(c.probability)} (needs ${bar})`);
    }
  }
  if (!short.length) return null;
  return `${c.name}: ${short.join("; ")}${i.repeats ? "" : " (extra runs not made)"}`;
}

/** The candidate leaning, when only P1 or P4 blocked it and each by less than NEAR_MISS_MARGIN. */
export function leaningNearMiss(i: LeaningGateInput, checks: RuleCheck[]): string | null {
  const failed = failedChecks(checks);
  if (!failed.length || failed.some((c) => c.id !== "P1" && c.id !== "P4")) return null;
  const short: string[] = [];
  if (failed.some((c) => c.id === "P1")) {
    if (i.pStance < nearLow(PUBLISH.minStance)) return null;
    short.push(`takes a position ${p2(i.pStance)} (needs ${PUBLISH.minStance})`);
  }
  if (failed.some((c) => c.id === "P4")) {
    const p = i.independent[i.leaning];
    if (compareWithIndependent(i.leaning, i.independent).steps !== 0 || p < nearLow(PUBLISH.minLeaning)) return null;
    short.push(`the independent check gives ${i.leaning} ${p2(p)} (needs ${PUBLISH.minLeaning})`);
  }
  return `${i.leaning}: ${short.join("; ")}${checks.some((c) => c.id === "P6" && c.skipped) ? " (extra runs not made)" : ""}`;
}
