import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import type { ScoredClaim, ScoringAgent } from "../agent/v3/agent.js";
import { CARD_BY_NAME } from "../framework/ideologies.js";
import { FRAMEWORK_VERSION } from "../framework/rubric.js";
import { fetchClaims } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import { mapPool } from "../util/pool.js";

/**
 * Armando's example claims (evals/armando-examples.json): for each, the ideological leanings he
 * linked to it. They are the closest thing to ground truth for ideological leanings, so the
 * agent is measured against them, never tuned on them.
 */
const Examples = z.object({
  version: z.string(),
  source: z.string(),
  items: z.array(z.object({ id: z.string(), text: z.string(), leanings: z.array(z.string()).min(1) })),
});
export type ExampleItem = z.infer<typeof Examples>["items"][number];

export function loadExamples(path: string): { version: string; items: ExampleItem[] } {
  const set = Examples.parse(JSON.parse(readFileSync(path, "utf8")));
  for (const item of set.items) for (const name of item.leanings) if (!CARD_BY_NAME.has(name)) throw new Error(`${item.id}: unknown leaning "${name}"`);
  return set;
}

export interface ExampleJudgement {
  /** Published leanings Armando also linked. */
  matched: string[];
  /** Published leanings Armando did not link to this claim. */
  extra: string[];
  /** Leanings Armando linked that the agent did not publish. */
  missed: string[];
}

export function judgeExample(item: ExampleItem, published: string[]): ExampleJudgement {
  return {
    matched: published.filter((n) => item.leanings.includes(n)),
    extra: published.filter((n) => !item.leanings.includes(n)),
    missed: item.leanings.filter((n) => !published.includes(n)),
  };
}

interface Counts {
  /** Armando's labels on these claims. */
  expected: number;
  published: number;
  matched: number;
  extra: number;
}

export interface ExamplesSummary {
  set: string;
  framework: string;
  claims: number;
  errors: number;
  /** All ideological leanings, then issue leanings and traditions separately. */
  all: Counts;
  issue: Counts;
  tradition: Counts;
  /** Claims where the agent found no political position of the claim's own. */
  noPosition: number;
  /** Political leanings published on these claims (Armando's examples give none to compare with). */
  leaningsPublished: number;
}

export interface ExampleRow {
  item: ExampleItem;
  result: ScoredClaim | null;
  error: string | null;
  judged: ExampleJudgement | null;
}

const emptyCounts = (): Counts => ({ expected: 0, published: 0, matched: 0, extra: 0 });

export async function runExamples(geo: GeoClient, agent: ScoringAgent, items: ExampleItem[], concurrency: number): Promise<ExampleRow[]> {
  const claims = new Map((await fetchClaims(geo, items.map((i) => i.id))).map((c) => [c.id, c]));
  return mapPool(items, concurrency, async (item): Promise<ExampleRow> => {
    const claim = claims.get(item.id);
    if (!claim) return { item, result: null, error: "claim not found on Geo", judged: null };
    try {
      const result = await agent.score(claim);
      return { item, result, error: null, judged: judgeExample(item, result.ideologies.map((i) => i.name)) };
    } catch (err) {
      return { item, result: null, error: err instanceof Error ? err.message : String(err), judged: null };
    }
  });
}

export function summarizeExamples(set: string, rows: ExampleRow[]): ExamplesSummary {
  const s: ExamplesSummary = { set, framework: FRAMEWORK_VERSION, claims: rows.length, errors: 0, all: emptyCounts(), issue: emptyCounts(), tradition: emptyCounts(), noPosition: 0, leaningsPublished: 0 };
  const kindOf = (name: string) => CARD_BY_NAME.get(name)!.kind;
  for (const { item, result, judged } of rows) {
    if (!result || !judged) {
      s.errors++;
      continue;
    }
    if (result.outcome === "no_position") s.noPosition++;
    if (result.leaning) s.leaningsPublished++;
    const add = (key: keyof Counts, names: string[]) => {
      for (const n of names) {
        s.all[key]++;
        s[kindOf(n)][key]++;
      }
    };
    add("expected", item.leanings);
    add("published", result.ideologies.map((i) => i.name));
    add("matched", judged.matched);
    add("extra", judged.extra);
  }
  return s;
}

export function writeExamples(rows: ExampleRow[], summary: ExamplesSummary): string {
  mkdirSync("evals/results", { recursive: true });
  const path = `evals/results/examples.${summary.set}.${summary.framework}.json`;
  writeFileSync(
    path,
    JSON.stringify(
      {
        summary,
        rows: rows.map(({ item, result, error, judged }) => ({
          id: item.id,
          text: item.text,
          armando: item.leanings,
          error,
          display: result?.display ?? null,
          leaning: result?.leaning ?? null,
          published: result?.ideologies.map((i) => i.name) ?? [],
          matched: judged?.matched ?? [],
          extra: judged?.extra ?? [],
          missed: judged?.missed ?? [],
          checks: result?.checks.map((c) => `${c.id} ${c.skipped ? "skipped" : c.pass ? "pass" : "FAIL"}: ${c.detail}`) ?? [],
          explanation: result?.explanation ?? null,
          droppedIdeologies: result?.droppedIdeologies.map((d) => `${d.name}: ${d.reason}`) ?? [],
          reviewerNotes: result?.reviewerNotes ?? [],
          nearMisses: result?.nearMisses ?? [],
        })),
      },
      null,
      2,
    ) + "\n",
  );
  return path;
}
