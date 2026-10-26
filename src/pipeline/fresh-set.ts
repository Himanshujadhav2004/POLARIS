import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ScoredClaim, ScoringAgent } from "../agent/v3/agent.js";
import { SPACES, type Space } from "../config.js";
import { FRAMEWORK_VERSION } from "../framework/rubric.js";
import { fetchClaims, sampleClaimIds, type Claim } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import { idsInProposals } from "../publish/dry-run.js";
import { mapPool } from "../util/pool.js";
import { seededRng, type Rng } from "../util/random.js";
import { previouslyUsedIds, selectRows } from "./qa-sample.js";

export const FRESH_ROOT = "evals/fresh";

/**
 * Every claim used so far, so a fresh set measures the agent on claims it was never tuned on:
 * the dev set, QA rounds, test sets, Armando's examples, proposal batches and earlier fresh sets.
 */
export function usedClaimIds(o: { qaRoot?: string; testSets?: string[]; proposalsRoot?: string; freshRoot?: string } = {}): Set<string> {
  const ids = previouslyUsedIds(o.qaRoot);
  // Armando's examples are the calibration set, so a fresh (held-out) sample must never draw them.
  for (const file of o.testSets ?? ["evals/test-set-v1.json", "evals/armando-examples.json"]) {
    for (const item of (JSON.parse(readFileSync(file, "utf8")) as { items: { id: string }[] }).items) ids.add(item.id);
  }
  for (const id of idsInProposals(o.proposalsRoot)) ids.add(id);
  const freshRoot = o.freshRoot ?? FRESH_ROOT;
  if (existsSync(freshRoot)) {
    for (const entry of readdirSync(freshRoot, { withFileTypes: true })) {
      const file = join(freshRoot, entry.name, "fresh.json");
      if (!entry.isDirectory() || !existsSync(file)) continue;
      for (const row of (JSON.parse(readFileSync(file, "utf8")) as { rows: { claimId: string }[] }).rows) ids.add(row.claimId);
    }
  }
  return ids;
}

export interface FreshRow {
  space: Space;
  claim: Claim;
  result: ScoredClaim | null;
  error: string | null;
  /** Part of the 10-per-space QA sample; every row with a published label goes to review either way. */
  inSample: boolean;
}

export interface FreshStats {
  space: string;
  scored: number;
  published: number;
  errors: number;
  sample: number;
}

export interface FreshSetOptions {
  geo: GeoClient;
  agent: ScoringAgent;
  seed: number;
  /** New claims scored per space. */
  pool: number;
  /**
   * Instead of `pool` per space: this many claims in all, split as evenly as possible over the spaces
   * (the first spaces take the remainder). A space with too few new claims passes its shortfall on.
   */
  total?: number;
  /** Only these spaces (by slug); all 7 by default. */
  spaces?: string[];
  /** Rows per space in the QA sample. */
  perSpace: number;
  /** Rows with a published label to put first in each space's sample (the rest are blanks). */
  labelled: number;
  concurrency: number;
  exclude: ReadonlySet<string>;
  /**
   * Draw only claims whose text contains one of these (case-sensitive), split evenly. Random claims are
   * rarely political, so an opinion sample (" should ", " must ") is what measures label accuracy.
   */
  includes?: string[];
  log?: (line: string) => void;
}

/** Claim IDs for one space: a plain random draw, or an even split over the `includes` texts. */
export async function drawIds(geo: GeoClient, spaceId: string, want: number, rng: Rng, includes?: string[]): Promise<string[]> {
  if (!includes?.length) return sampleClaimIds(geo, spaceId, want, rng);
  const ids: string[] = [];
  // One text at a time, so the seeded draws happen in a fixed order.
  for (const text of includes) ids.push(...(await sampleClaimIds(geo, spaceId, Math.ceil(want / includes.length), rng, 2, text)));
  return [...new Set(ids)];
}

const published = (r: ScoredClaim | null) => Boolean(r && (r.leaning || r.ideologies.length));

/** A space's share of `total` claims split evenly over `spaces` spaces, the first ones taking the remainder. */
export const spaceShare = (total: number, index: number, spaces: number = SPACES.length): number =>
  Math.floor(total / spaces) + (index < total % spaces ? 1 : 0);

/** Scores `pool` never-used claims per space and picks the 10-per-space QA sample from them. */
export async function buildFreshSet(o: FreshSetOptions): Promise<{ rows: FreshRow[]; stats: FreshStats[] }> {
  const log = o.log ?? (() => {});
  const rows: FreshRow[] = [];
  const stats: FreshStats[] = [];
  let shortfall = 0;
  const chosen = SPACES.filter((s) => !o.spaces || o.spaces.includes(s.slug));
  if (o.spaces && chosen.length !== o.spaces.length) throw new Error(`Unknown space in ${o.spaces.join(", ")}`);
  for (const [position, space] of chosen.entries()) {
    // Seeded by the space's place among all 7, so a space draws the same claims with or without --spaces.
    const index = SPACES.indexOf(space);
    const rng = seededRng(o.seed * 1000 + index);
    const want = o.total === undefined ? o.pool : spaceShare(o.total, position, chosen.length) + shortfall;
    // Draw extra IDs: some are excluded, have no text or already carry Leanings.
    const ids = (await drawIds(o.geo, space.id, Math.ceil(want * (o.total === undefined ? 1.5 : 2)), rng, o.includes)).filter((id) => !o.exclude.has(id));
    const claims = (await fetchClaims(o.geo, ids)).filter((c) => c.text && c.leaningIds.length === 0).slice(0, want);
    if (o.total !== undefined) shortfall = want - claims.length;
    const scored = await mapPool(claims, o.concurrency, async (claim) => {
      try {
        return { space, claim, result: await o.agent.score(claim), error: null, inSample: false } as FreshRow;
      } catch (err) {
        return { space, claim, result: null, error: err instanceof Error ? err.message : String(err), inSample: false } as FreshRow;
      }
    });
    const candidates = scored.filter((r) => r.result).map((row) => ({ row, result: { abstained: !published(row.result) } }));
    for (const { row } of selectRows(candidates, o.perSpace, o.labelled, rng)) row.inSample = true;
    rows.push(...scored);
    const s: FreshStats = {
      space: space.name,
      scored: scored.length,
      published: scored.filter((r) => published(r.result)).length,
      errors: scored.filter((r) => r.error).length,
      sample: scored.filter((r) => r.inSample).length,
    };
    stats.push(s);
    log(`${space.name}: ${s.scored} scored, ${s.published} with a published label, ${s.errors} errors, ${s.sample} in the sample`);
  }
  return { rows, stats };
}

const rowJson = ({ space, claim, result, error, inSample }: FreshRow) => ({
  claimId: claim.id,
  space: space.slug,
  spaceId: space.id,
  text: claim.text,
  inSample,
  error,
  published: published(result),
  display: result?.display ?? null,
  leaning: result?.leaning ?? null,
  candidateLeaning: result?.candidateLeaning ?? null,
  ideologies: result?.ideologies.map((i) => i.name) ?? [],
  checks: result?.checks.map((c) => `${c.id} ${c.skipped ? "skipped" : c.pass ? "pass" : "FAIL"}: ${c.detail}`) ?? [],
  criteria: result?.criteria.map((c) => `${c.id} (${c.strength}): “${c.evidence}”`) ?? [],
  explanation: result?.explanation ?? null,
  droppedIdeologies: result?.droppedIdeologies.map((d) => `${d.name}: ${d.reason}`) ?? [],
  repeats: result?.repeats ?? null,
  reviewerNotes: result?.reviewerNotes ?? [],
  nearMisses: result?.nearMisses ?? [],
});

export function writeFreshSet(name: string, seed: number, rows: FreshRow[], stats: FreshStats[]): string {
  const dir = join(FRESH_ROOT, name);
  if (existsSync(join(dir, "fresh.json"))) throw new Error(`${dir} already holds a fresh set; use another --seed`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "fresh.json");
  writeFileSync(
    file,
    JSON.stringify({ name, seed, framework: FRAMEWORK_VERSION, generatedAt: new Date().toISOString(), stats, rows: rows.map(rowJson) }, null, 2) + "\n",
  );
  return file;
}

/**
 * Scores an existing fresh set again with the current framework, keeping the same claims and
 * sample, and writes evals/fresh/<name>/rescore.<framework>.json next to the original.
 */
export async function rescoreFreshSet(geo: GeoClient, agent: ScoringAgent, name: string, concurrency: number): Promise<{ file: string; rows: FreshRow[] }> {
  const original = JSON.parse(readFileSync(join(FRESH_ROOT, name, "fresh.json"), "utf8")) as { seed: number; rows: { claimId: string; space: string; text: string; inSample: boolean }[] };
  const claims = new Map((await fetchClaims(geo, original.rows.map((r) => r.claimId))).map((c) => [c.id, c]));
  const rows = await mapPool(original.rows, concurrency, async (r): Promise<FreshRow> => {
    const space = SPACES.find((s) => s.slug === r.space)!;
    const claim = claims.get(r.claimId);
    // A claim removed from Geo since the set was drawn is an error row, not the end of the run.
    if (!claim) {
      const gone: Claim = { id: r.claimId, text: r.text, spaceIds: [space.id], isFactual: null, context: {}, leaningIds: [] };
      return { space, claim: gone, result: null, error: `${r.claimId} is no longer on Geo`, inSample: r.inSample };
    }
    try {
      return { space, claim, result: await agent.score(claim), error: null, inSample: r.inSample };
    } catch (err) {
      return { space, claim, result: null, error: err instanceof Error ? err.message : String(err), inSample: r.inSample };
    }
  });
  const file = join(FRESH_ROOT, name, `rescore.${FRAMEWORK_VERSION}.json`);
  writeFileSync(file, JSON.stringify({ name, seed: original.seed, framework: FRAMEWORK_VERSION, generatedAt: new Date().toISOString(), rows: rows.map(rowJson) }, null, 2) + "\n");
  return { file, rows };
}
