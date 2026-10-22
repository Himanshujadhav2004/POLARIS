import type { Classification, Classifier } from "../agent/classify.js";
import { PROMPT_VERSION } from "../agent/prompt.js";
import type { Claim } from "../geo/claims.js";
import { mapPool } from "../util/pool.js";
import type { RunState } from "./state.js";

export type Outcome = Classification | { error: string };

/**
 * Classifies claims, reusing stored results for the same model, prompt version and taxonomy.
 * Failures are returned per claim instead of stopping the run.
 */
export async function classifyWithCache(
  classifier: Classifier,
  state: RunState,
  jobs: { claim: Claim; spaceId: string | null }[],
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, Outcome>> {
  const fingerprint = classifier.taxonomyFingerprint;
  let done = 0;
  const outcomes = await mapPool(jobs, concurrency, async ({ claim, spaceId }): Promise<[string, Outcome]> => {
    let outcome: Outcome;
    const cached = state.get(claim.id, classifier.model, PROMPT_VERSION, fingerprint);
    if (cached) {
      outcome = cached;
    } else {
      try {
        const result = await classifier.classify(claim);
        state.put(result, spaceId);
        outcome = result;
      } catch (err) {
        outcome = { error: err instanceof Error ? err.message : String(err) };
      }
    }
    onProgress?.(++done, jobs.length);
    return [claim.id, outcome];
  });
  return new Map(outcomes);
}
