import type { ScoredClaim, ScoringAgent } from "../agent/v3/agent.js";
import type { Space } from "../config.js";
import { fetchClaims, type Claim } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import type { Taxonomy } from "../geo/taxonomy.js";
import { mapPool } from "../util/pool.js";

export interface BatchItem {
  claim: Claim;
  /** The scoring agent's result; only its published labels are proposed. */
  result: ScoredClaim;
  /** Geo value IDs of the published leaning and ideologies. */
  valueIds: string[];
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

/** Geo value IDs for everything the agent published. */
export function valueIdsFor(r: ScoredClaim, taxonomy: Taxonomy): string[] {
  return [r.leaning, ...r.ideologies.map((i) => i.name)]
    .filter((n): n is string => Boolean(n))
    .map((name) => {
      const value = taxonomy.byName.get(name);
      if (!value) throw new Error(`"${name}" is not on Geo yet, so it cannot go into a proposal until it is published there`);
      return value.id;
    });
}

export interface BuildBatchOptions {
  geo: GeoClient;
  agent: ScoringAgent;
  taxonomy: Taxonomy;
  space: Space;
  /** Claims whose labels Armando approved in Notion. Nothing else is ever proposed. */
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
