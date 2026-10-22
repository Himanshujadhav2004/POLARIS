import { CARD_BY_NAME } from "../../framework/ideologies.js";
import {
  ALL_CRITERIA,
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
export type UncertainReason = "mixed signals" | "cross-cutting" | "no criterion matched";

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
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'.,;:]+|["'.,;:]+$/g, "");

/** Rule E1: evidence must be words that actually appear in the claim. */
export function evidenceFound(claim: string, quote: string): boolean {
  const q = normalize(quote);
  return q.length >= 3 && normalize(claim).includes(q);
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

  // Keep valid matches with real evidence; one per topic area (the strongest), unless they disagree.
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
  /** The leaning each extra scorer run gave; null while the extra runs have not been made. */
  repeats: (LeaningName | null)[] | null;
}

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
      pass: Boolean(i.country?.trim()),
      detail: i.country?.trim() ? `country: ${i.country}` : "the claim does not make clear which country's politics it concerns",
    },
    {
      id: "P4",
      pass: cmp.steps === 0 && pLeaning >= PUBLISH.minLeaning,
      detail:
        cmp.steps !== 0
          ? `the independent check prefers ${cmp.top} (${p2(cmp.pTop)}); ${i.leaning} gets ${p2(pLeaning)}`
          : `the independent check gives ${i.leaning} ${p2(pLeaning)}${pLeaning >= PUBLISH.minLeaning ? "" : `, below ${PUBLISH.minLeaning}`}`,
    },
    { id: "P5", pass: i.verifierAgrees, detail: i.verifierAgrees ? "the verifier agreed" : "the verifier disagreed" },
  ];
  checks.push(stability(i.leaning, i.repeats));
  return checks;
}

function stability(leaning: LeaningName, repeats: (LeaningName | null)[] | null): RuleCheck {
  if (!repeats) return { id: "P6", pass: false, skipped: true, detail: "extra runs not made, because an earlier rule failed" };
  const same = repeats.filter((r) => r === leaning).length + 1;
  const others = repeats.filter((r) => r !== leaning).map((r) => r ?? "no leaning");
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
  tenet: string;
  tenetText: string;
  distinctive: boolean;
  evidence: string;
  probability: number;
}

export interface DroppedIdeology {
  name: string;
  reason: string;
}

/** Keeps proposals whose belief exists and whose evidence is in the claim (I1, E1, I4). */
export function resolveIdeologies(
  proposed: ScorerOutput["ideologies"],
  claimText: string,
  probabilities: Record<string, number>,
): { candidates: IdeologyCandidate[]; dropped: DroppedIdeology[] } {
  const candidates: IdeologyCandidate[] = [];
  const dropped: DroppedIdeology[] = [];
  for (const p of proposed.slice(0, 2)) {
    const card = CARD_BY_NAME.get(p.name);
    const tenet = card?.tenets.find((t) => t.id === p.tenet);
    if (!card || !tenet) {
      dropped.push({ name: p.name, reason: `belief ${p.tenet} does not exist on the card` });
      continue;
    }
    if (!evidenceFound(claimText, p.evidence)) {
      dropped.push({ name: p.name, reason: "its evidence is not in the claim" });
      continue;
    }
    candidates.push({ name: card.name, tenet: tenet.id, tenetText: tenet.text, distinctive: tenet.distinctive, evidence: p.evidence, probability: probabilities[p.name] ?? 0 });
  }
  return { candidates, dropped };
}

export interface IdeologyGateInput {
  candidate: IdeologyCandidate;
  pStance: number;
  /** The leaning the criteria point to, published or not. */
  leaning: LeaningName | null;
  verifierAgrees: boolean;
  /** Neighbouring ideologies whose own beliefs the claim also matches, and that are not published (I6). */
  matchingNeighbours: string[];
  /** Whether each extra run found this ideology too; null while the extra runs have not been made. */
  repeats: boolean[] | null;
}

/** Rule I3: every reason this ideology cannot be published; empty means publish. */
export function checkIdeology(i: IdeologyGateInput, withRepeats = true): string[] {
  const c = i.candidate;
  const card = CARD_BY_NAME.get(c.name)!;
  const failed: string[] = [];
  if (!c.distinctive) failed.push(`belief ${c.tenet} is shared${card.neighbours.length ? ` with ${card.neighbours.join(", ")}` : ""}`);
  if (c.probability < PUBLISH.minIdeology) failed.push(`independent probability ${p2(c.probability)} is below ${PUBLISH.minIdeology}`);
  if (i.pStance < PUBLISH.minStance) failed.push(`independent probability that the claim takes a position is ${p2(i.pStance)}, below ${PUBLISH.minStance}`);
  if (i.leaning && !card.typicalLeanings.includes(i.leaning)) failed.push(`it is not usually found at ${i.leaning}`);
  if (!i.verifierAgrees) failed.push("the verifier disagreed");
  if (i.matchingNeighbours.length) failed.push(`the claim also matches ${i.matchingNeighbours.join(", ")} (I6)`);
  if (withRepeats) {
    // Missing extra runs only matter when nothing else already blocks it.
    if (!i.repeats) {
      if (!failed.length) failed.push("extra runs not made");
    }
    else if (!i.repeats.every(Boolean)) failed.push(`found in ${i.repeats.filter(Boolean).length + 1} of ${PUBLISH.runs} runs`);
  }
  return failed;
}
