import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Classification, Classifier } from "../agent/classify.js";
import { SPACES, type Space } from "../config.js";
import { DEV_SET_PATH } from "../eval/run.js";
import { countClaims, fetchClaims, sampleClaimIds, type Claim } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import { seededRng, shuffle, type Rng } from "../util/random.js";
import { classifyWithCache } from "./classify-claims.js";
import type { RunState } from "./state.js";

export interface QaRow {
  space: Space;
  claim: Claim;
  result: Classification;
}

export interface SpaceStats {
  space: Space;
  claimsInSpace: number;
  pool: number;
  labelled: number;
  errors: number;
  rows: number;
}

export interface QaSample {
  rows: QaRow[];
  stats: SpaceStats[];
  seed: number;
}

export interface QaSampleOptions {
  geo: GeoClient;
  classifier: Classifier;
  state: RunState;
  seed: number;
  /** Claims drawn per round for each space. */
  pool: number;
  /** Extra rounds are drawn while a space has fewer labelled claims than `labelled`. */
  maxRounds: number;
  perSpace: number;
  labelled: number;
  concurrency: number;
  /** Claims that must not appear, e.g. the dev set and earlier QA rounds. */
  excludeIds: ReadonlySet<string>;
  log?: (line: string) => void;
}

/** IDs from the dev set and every earlier QA round, so a new sample is a clean test. */
export function previouslyUsedIds(qaRoot = "qa"): Set<string> {
  const ids = new Set((JSON.parse(readFileSync(DEV_SET_PATH, "utf8")) as { items: { id: string }[] }).items.map((i) => i.id));
  if (!existsSync(qaRoot)) return ids;
  for (const entry of readdirSync(qaRoot, { withFileTypes: true })) {
    const manifest = join(qaRoot, entry.name, "qa_sample.json");
    if (!entry.isDirectory() || !existsSync(manifest)) continue;
    for (const row of (JSON.parse(readFileSync(manifest, "utf8")) as { rows: { claimId: string }[] }).rows) ids.add(row.claimId);
  }
  return ids;
}

/**
 * Builds the reviewer sample: classify a random pool per space, then pick up to `labelled`
 * labelled claims and fill the rest of the `perSpace` rows with blanks.
 */
export async function buildQaSample(options: QaSampleOptions): Promise<QaSample> {
  const log = options.log ?? (() => {});
  const rows: QaRow[] = [];
  const stats: SpaceStats[] = [];

  for (const [index, space] of SPACES.entries()) {
    const rng = seededRng(options.seed * 1000 + index);
    const seen = new Set<string>();
    const results: { claim: Claim; result: Classification }[] = [];
    let errors = 0;

    for (let round = 0; round < options.maxRounds; round++) {
      const ids = (await sampleClaimIds(options.geo, space.id, options.pool, rng)).filter((id) => !seen.has(id) && !options.excludeIds.has(id));
      ids.forEach((id) => seen.add(id));
      // Claims that already carry Leanings are out of scope for the agent.
      const claims = (await fetchClaims(options.geo, ids)).filter((c) => c.text && c.leaningIds.length === 0);
      const outcomes = await classifyWithCache(
        options.classifier,
        options.state,
        claims.map((claim) => ({ claim, spaceId: space.id })),
        options.concurrency,
      );
      for (const claim of claims) {
        const outcome = outcomes.get(claim.id);
        if (!outcome || "error" in outcome) {
          errors++;
          log(`  ! ${claim.id}: ${outcome && "error" in outcome ? outcome.error : "missing"}`);
          continue;
        }
        results.push({ claim, result: outcome });
      }
      const labelledSoFar = results.filter((r) => !r.result.abstained).length;
      log(`${space.name}: round ${round + 1}, ${results.length} classified, ${labelledSoFar} labelled`);
      if (labelledSoFar >= options.labelled) break;
    }

    const picked = selectRows(results, options.perSpace, options.labelled, rng);
    rows.push(...picked.map(({ claim, result }) => ({ space, claim, result })));

    stats.push({
      space,
      claimsInSpace: await countClaims(options.geo, space.id),
      pool: results.length,
      labelled: results.filter((r) => !r.result.abstained).length,
      errors,
      rows: picked.length,
    });
  }
  return { rows, stats, seed: options.seed };
}

/**
 * Picks up to `labelled` labelled items, fills the rest of `perSpace` with blanks, and tops up
 * with more labelled items when there are too few blanks. Labelled rows come first.
 */
export function selectRows<T extends { result: { abstained: boolean } }>(
  items: readonly T[],
  perSpace: number,
  labelled: number,
  rng: Rng,
): T[] {
  const withLabel = shuffle(items.filter((i) => !i.result.abstained), rng);
  const blank = shuffle(items.filter((i) => i.result.abstained), rng);
  const firstLabelled = withLabel.slice(0, Math.min(labelled, perSpace));
  const blanks = blank.slice(0, perSpace - firstLabelled.length);
  const topUp = withLabel.slice(firstLabelled.length, firstLabelled.length + perSpace - firstLabelled.length - blanks.length);
  return [...firstLabelled, ...topUp, ...blanks];
}
