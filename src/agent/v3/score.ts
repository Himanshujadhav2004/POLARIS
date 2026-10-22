import { CARD_BY_NAME } from "../../framework/ideologies.js";
import {
  ALL_CRITERIA,
  CONFIDENCE,
  LEANING_BY_SCORE,
  LEANINGS_LEFT_TO_RIGHT,
  STANCE_GATE,
  type Criterion,
  type GateCheck,
  type LeaningName,
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
export type UncertainReason = "mixed signals" | "cross-cutting" | "no criterion matched" | "low confidence" | "signals disagree";

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
// Step 5: confidence.

export interface ConfidenceInput {
  hedged: boolean;
  /** Weakest strength among the criteria that produced the leaning. */
  weakestStrength: Strength;
  /** Decisions API: probability that the claim takes a position. */
  pStance: number;
  /** Decisions API: probability of the final leaning on the 7-point scale. */
  pLeaning: number;
  verifierAgrees: boolean;
}

export interface Confidence {
  total: number;
  band: "High" | "Medium" | "Low";
  components: Record<"explicitness" | "match" | "probability" | "verifier", number>;
}

const MATCH_POINTS: Record<Strength, number> = { direct: 25, close: 15, partial: 5 };

export function scoreConfidence(i: ConfidenceInput): Confidence {
  const components = {
    explicitness: i.hedged ? 10 : 25,
    match: MATCH_POINTS[i.weakestStrength],
    probability: Math.round(30 * i.pLeaning),
    verifier: i.verifierAgrees ? 20 : 0,
  };
  const total = i.pStance < 0.5 ? 0 : components.explicitness + components.match + components.probability + components.verifier;
  return { total, band: bandOf(total), components };
}

export function bandOf(total: number): Confidence["band"] {
  return (CONFIDENCE.bands.find((b) => total >= b.min)?.name ?? "Low") as Confidence["band"];
}

// ---------------------------------------------------------------------------
// Step 4: ideologies.

export interface AssignedIdeology {
  name: string;
  qualifier: "Clear" | "Potential";
  tenet: string;
  tenetText: string;
  distinctive: boolean;
  evidence: string;
  probability: number;
  /** Neighbouring ideologies a shared belief could also point to. */
  alternatives: string[];
}

export interface DroppedIdeology {
  name: string;
  reason: string;
}

export function resolveIdeologies(
  proposed: ScorerOutput["ideologies"],
  claimText: string,
  probabilities: Record<string, number>,
  finalLeaning: LeaningName | null,
): { assigned: AssignedIdeology[]; dropped: DroppedIdeology[] } {
  const assigned: AssignedIdeology[] = [];
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
    const probability = probabilities[p.name] ?? 0;
    if (probability < 0.5) {
      dropped.push({ name: p.name, reason: `independent probability ${probability.toFixed(2)} is below 0.5` });
      continue;
    }
    const atypical = finalLeaning !== null && !card.typicalLeanings.includes(finalLeaning);
    const clear = tenet.distinctive && probability >= 0.8 && !atypical;
    assigned.push({
      name: card.name,
      qualifier: clear ? "Clear" : "Potential",
      tenet: tenet.id,
      tenetText: tenet.text,
      distinctive: tenet.distinctive,
      evidence: p.evidence,
      probability,
      alternatives: tenet.distinctive ? [] : card.neighbours,
    });
  }
  return { assigned, dropped };
}

/** "Potentially center left" / "Center left", in the style of Armando's example. */
export function displayLabel(name: string, qualifier: "Clear" | "Potential"): string {
  if (qualifier === "Clear") return name;
  const isAcronym = name === name.toUpperCase();
  return `Potentially ${isAcronym ? name : name.charAt(0).toLowerCase() + name.slice(1)}`;
}
