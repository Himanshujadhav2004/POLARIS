import type { Classification, Classifier } from "../agent/classify.js";
import { labelKey, VERIFIER_VERSION, type Verification, type Verifier } from "../agent/verify.js";
import type { Space } from "../config.js";
import { fetchClaims, sampleClaimIds, type Claim } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import { classifyWithCache } from "../pipeline/classify-claims.js";
import type { RunState } from "../pipeline/state.js";
import { mapPool } from "../util/pool.js";
import { seededRng, shuffle, type Rng } from "../util/random.js";

export interface BatchItem {
  claim: Claim;
  classification: Classification;
  verification: Verification;
}

export interface Rejection {
  claim: Claim;
  reason: string;
}

export interface Batch {
  space: Space;
  items: BatchItem[];
  /** Candidates that passed every check but were not needed for this batch. */
  spare: BatchItem[];
  rejected: Rejection[];
  seed: number;
  candidates: number;
}

/**
 * Publishing checks that need no extra model call. Returns why a claim fails, or null.
 * Only high-confidence labels go forward: in QA every error was medium confidence.
 */
export function preVerifyGate(space: Space, claim: Claim, c: Classification): string | null {
  if (!claim.spaceIds.includes(space.id)) return "claim is not in this space";
  if (claim.leaningIds.length) return "claim already has Leanings";
  if (c.abstained) return `agent left it blank (${c.label.abstain_reason})`;
  if (c.label.confidence !== "high") return `agent confidence is ${c.label.confidence}`;
  return null;
}

export function verifyGate(v: Verification): string | null {
  return v.verdict === "agree" ? null : `verifier disagreed: ${v.problems}`;
}

const LEFT = new Set(["Far left", "Left", "Center left"]);
const RIGHT = new Set(["Center right", "Right", "Far right"]);

export function side(leaning: string | null): "left" | "right" | "other" {
  return leaning && LEFT.has(leaning) ? "left" : leaning && RIGHT.has(leaning) ? "right" : "other";
}

/** Picks `count` items, alternating left, right and other so one batch does not lean one way. */
export function pickBalanced<T>(items: readonly T[], sideOf: (item: T) => "left" | "right" | "other", count: number, rng: Rng): T[] {
  const groups = (["left", "right", "other"] as const).map((s) => shuffle(items.filter((i) => sideOf(i) === s), rng));
  const picked: T[] = [];
  while (picked.length < count && groups.some((g) => g.length)) {
    for (const group of groups) {
      const next = group.shift();
      if (next !== undefined && picked.length < count) picked.push(next);
    }
  }
  return picked;
}

export interface BuildBatchOptions {
  geo: GeoClient;
  classifier: Classifier;
  verifier: Verifier;
  state: RunState;
  space: Space;
  count: number;
  /** Candidate claims to draw. */
  pool: number;
  seed: number;
  concurrency: number;
  exclude: ReadonlySet<string>;
  /** Only draw claims whose text contains this, e.g. " should " for opinion claims. */
  nameIncludes?: string;
  /** After manual review: use exactly these claims, each of which must have passed every check. */
  only?: ReadonlySet<string>;
  log?: (line: string) => void;
}

export async function buildBatch(o: BuildBatchOptions): Promise<Batch> {
  const log = o.log ?? (() => {});
  const rng = seededRng(o.seed);
  // With `only`, fetch exactly the reviewed claims (fresh from Geo) instead of drawing a pool.
  const ids = o.only
    ? [...o.only]
    : (await sampleClaimIds(o.geo, o.space.id, o.pool, rng, 2, o.nameIncludes)).filter((id) => !o.exclude.has(id));
  const claims = (await fetchClaims(o.geo, ids)).filter((c) => c.text);
  log(o.only ? `${claims.length} reviewed claims fetched from ${o.space.name}` : `${claims.length} candidate claims drawn from ${o.space.name}`);

  const outcomes = await classifyWithCache(o.classifier, o.state, claims.map((claim) => ({ claim, spaceId: o.space.id })), o.concurrency);
  const rejected: Rejection[] = [];
  const toVerify: { claim: Claim; classification: Classification }[] = [];
  for (const claim of claims) {
    const outcome = outcomes.get(claim.id);
    if (!outcome || "error" in outcome) {
      rejected.push({ claim, reason: `classification failed: ${outcome && "error" in outcome ? outcome.error : "missing"}` });
      continue;
    }
    const reason = preVerifyGate(o.space, claim, outcome);
    if (reason) rejected.push({ claim, reason });
    else toVerify.push({ claim, classification: outcome });
  }
  log(`${toVerify.length} passed the automatic checks; verifying`);

  const verified = await mapPool(toVerify, o.concurrency, async ({ claim, classification }): Promise<BatchItem | Rejection> => {
    const key = labelKey(classification.label);
    let verification = o.state.getVerification(claim.id, o.verifier.model, VERIFIER_VERSION, key);
    if (!verification) {
      try {
        verification = await o.verifier.verify(claim, classification.label);
        o.state.putVerification(verification);
      } catch (err) {
        return { claim, reason: `verification failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    }
    return { claim, classification, verification };
  });

  const passed: BatchItem[] = [];
  for (const v of verified) {
    if ("reason" in v) {
      rejected.push(v);
      continue;
    }
    const reason = verifyGate(v.verification);
    if (reason) rejected.push({ claim: v.claim, reason });
    else passed.push(v);
  }
  log(`${passed.length} passed verification`);

  let pool = passed;
  if (o.only) {
    const passedIds = new Set(passed.map((p) => p.claim.id));
    const notPassed = [...o.only].filter((id) => !passedIds.has(id));
    if (notPassed.length) throw new Error(`These claims did not pass every check, or are not in this pool: ${notPassed.join(", ")}`);
    pool = passed.filter((p) => o.only!.has(p.claim.id));
  }
  const items = pickBalanced(pool, (i) => side(i.classification.label.political_leaning), o.only ? pool.length : o.count, rng);
  const chosen = new Set(items);
  return { space: o.space, items, spare: passed.filter((p) => !chosen.has(p)), rejected, seed: o.seed, candidates: claims.length };
}
