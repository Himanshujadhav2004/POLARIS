import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { ScoredClaim, ScoringAgent } from "../agent/v3/agent.js";
import { FRAMEWORK_VERSION } from "../framework/rubric.js";
import { fetchClaims } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import { mapPool } from "../util/pool.js";
import { DEV_SET_PATH } from "./run.js";
import { scoreItem, type DevItem } from "./score.js";

export interface Eval3Summary {
  framework: string;
  total: number;
  passed: number;
  /** Published labels that fail the dev-set expectation: the number that must be zero. */
  wrongPublished: number;
  byOutcome: Record<string, number>;
  errors: number;
}

/** Runs agent v3 over the dev set and scores it with the same rules as earlier versions. */
export async function runEval3(geo: GeoClient, agent: ScoringAgent, concurrency: number): Promise<{ summary: Eval3Summary; rows: unknown[] }> {
  const items = (JSON.parse(readFileSync(DEV_SET_PATH, "utf8")) as { items: DevItem[] }).items;
  const claims = new Map((await fetchClaims(geo, items.map((i) => i.id))).map((c) => [c.id, c]));

  const results = await mapPool(items, concurrency, async (item) => {
    const claim = claims.get(item.id);
    if (!claim) return { item, error: "claim not found on Geo" as string, result: null as ScoredClaim | null };
    try {
      return { item, error: null, result: await agent.score(claim) };
    } catch (err) {
      return { item, error: err instanceof Error ? err.message : String(err), result: null };
    }
  });

  const summary: Eval3Summary = { framework: FRAMEWORK_VERSION, total: items.length, passed: 0, wrongPublished: 0, byOutcome: {}, errors: 0 };
  const rows = results.map(({ item, error, result }) => {
    if (!result) {
      summary.errors++;
      return { id: item.id, text: item.text, expect: item.expect, pass: false, reason: `error: ${error}` };
    }
    const label = {
      political_leaning: result.leaning,
      ideologies: result.ideologies.map((i) => i.name),
      confidence: "high" as const,
      evidence: "",
      rationale: "",
      abstain_reason: null,
    };
    const abstained = !result.leaning && !result.ideologies.length;
    const score = scoreItem(item, label, abstained);
    if (score.pass) summary.passed++;
    if (!score.pass && !abstained) summary.wrongPublished++;
    summary.byOutcome[result.outcome] = (summary.byOutcome[result.outcome] ?? 0) + 1;
    return {
      id: item.id,
      text: item.text,
      expect: item.expect,
      pass: score.pass,
      reason: score.reason,
      display: result.display,
      ideologies: result.ideologies.map((i) => i.name),
      checks: result.checks.map((c) => `${c.id} ${c.skipped ? "skipped" : c.pass ? "pass" : "FAIL"}: ${c.detail}`),
      criteria: result.criteria.map((c) => c.id),
      explanation: result.explanation,
      flags: result.flags,
    };
  });

  mkdirSync("evals/results", { recursive: true });
  writeFileSync(`evals/results/v3.${FRAMEWORK_VERSION}.json`, JSON.stringify({ summary, rows }, null, 2) + "\n");
  return { summary, rows };
}
