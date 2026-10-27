import type { ScoredClaim, ScoringAgent } from "../agent/v3/agent.js";
import type { Space } from "../config.js";
import { fetchClaims, type Claim } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import type { Taxonomy, TaxonomyKind } from "../geo/taxonomy.js";
import { mapPool } from "../util/pool.js";

export interface BatchItem {
  claim: Claim;
  /** The scoring agent's result; only its published labels are proposed. */
  result: ScoredClaim;
  /** Geo value IDs of the published leaning and ideologies. */
  valueIds: string[];
  /** Labels the agent published but a reviewer took out before the proposal, with the reason. */
  removed?: { name: string; reason: string }[];
}

/**
 * Takes labels out of a batch after review: one "claimId | value name | reason" per line. A label can
 * only be removed, never added, and a claim left with nothing is dropped from the batch.
 */
export function applyRemovals(items: BatchItem[], lines: string[], taxonomy: Taxonomy): BatchItem[] {
  const removals = lines
    .map((l) => l.split("#")[0]!.trim())
    .filter(Boolean)
    .map((l) => {
      const [claimId, name, reason] = l.split("|").map((s) => s.trim());
      if (!claimId || !name || !reason) throw new Error(`Removal lines are "claimId | value name | reason": ${l}`);
      return { claimId, name, reason };
    });
  for (const r of removals) {
    const item = items.find((i) => i.claim.id === r.claimId);
    if (!item) throw new Error(`Removal for ${r.claimId}, which is not in the batch`);
    if (item.result.leaning !== r.name && !item.result.ideologies.some((i) => i.name === r.name)) throw new Error(`${r.claimId} has no label "${r.name}"`);
  }
  return items
    .map((item) => {
      const mine = removals.filter((r) => r.claimId === item.claim.id);
      if (!mine.length) return item;
      const drop = new Set(mine.map((r) => r.name));
      const result = { ...item.result, leaning: item.result.leaning && drop.has(item.result.leaning) ? null : item.result.leaning, ideologies: item.result.ideologies.filter((i) => !drop.has(i.name)) };
      return { ...item, result, valueIds: valueIdsFor(result, taxonomy), removed: mine.map(({ name, reason }) => ({ name, reason })) };
    })
    .filter((item) => item.valueIds.length > 0);
}

export interface Rejection {
  claim: Claim;
  reason: string;
}

export interface Batch {
  space: Space;
  items: BatchItem[];
  rejected: Rejection[];
}

/** Why a scored claim cannot go into a proposal, or null when it can. */
export function publishGate(space: Space, claim: Claim, r: ScoredClaim): string | null {
  if (!claim.spaceIds.includes(space.id)) return "claim is not in this space";
  if (claim.leaningIds.length) return "claim already has Leanings";
  if (!r.leaning && !r.ideologies.length) return `the agent published nothing: ${r.display}`;
  return null;
}

/**
 * Geo value IDs for everything the agent published, each checked against its Geo type: at most one
 * Political position, at most one Ideological leaning, and any number of Issue positions.
 */
export function valueIdsFor(r: ScoredClaim, taxonomy: Taxonomy): string[] {
  const wanted: { name: string; kind: TaxonomyKind }[] = [
    ...(r.leaning ? [{ name: r.leaning, kind: "political_leaning" as const }] : []),
    ...r.ideologies.map((i) => ({ name: i.name, kind: i.kind === "tradition" ? ("ideology" as const) : ("issue_position" as const) })),
  ];
  if (wanted.filter((w) => w.kind === "ideology").length > 1) throw new Error(`${r.claimId} has more than one Ideological leaning`);
  return wanted.map(({ name, kind }) => {
    const value = taxonomy.byName.get(name);
    if (!value) throw new Error(`"${name}" is not on Geo yet, so it cannot go into a proposal until it is published there`);
    if (value.kind !== kind) throw new Error(`"${name}" is a ${value.kind} on Geo, not a ${kind}`);
    return value.id;
  });
}

export interface BuildBatchOptions {
  geo: GeoClient;
  agent: ScoringAgent;
  taxonomy: Taxonomy;
  space: Space;
  /** Claims chosen for this proposal after review. Nothing else is ever proposed. */
  approved: ReadonlySet<string>;
  concurrency: number;
  log?: (line: string) => void;
}

/** Scores the approved claims again (from cache) and keeps those whose published labels can be proposed. */
export async function buildBatch(o: BuildBatchOptions): Promise<Batch> {
  const log = o.log ?? (() => {});
  const claims = await fetchClaims(o.geo, [...o.approved]);
  const missing = [...o.approved].filter((id) => !claims.some((c) => c.id === id));
  if (missing.length) throw new Error(`These approved claims are not on Geo: ${missing.join(", ")}`);
  log(`${claims.length} approved claims fetched from ${o.space.name}`);

  const scored = await mapPool(claims, o.concurrency, async (claim): Promise<BatchItem | Rejection> => {
    try {
      const result = await o.agent.score(claim);
      const reason = publishGate(o.space, claim, result);
      return reason ? { claim, reason } : { claim, result, valueIds: valueIdsFor(result, o.taxonomy) };
    } catch (err) {
      return { claim, reason: `scoring failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  });
  const items = scored.filter((s): s is BatchItem => "result" in s);
  const rejected = scored.filter((s): s is Rejection => "reason" in s);
  log(`${items.length} still pass every publish rule`);
  return { space: o.space, items, rejected };
}
