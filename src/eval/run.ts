import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Classifier, type Classification } from "../agent/classify.js";
import { PROMPT_VERSION } from "../agent/prompt.js";
import { spaceBySlug } from "../config.js";
import { fetchClaims } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import type { Taxonomy } from "../geo/taxonomy.js";
import { classifyWithCache } from "../pipeline/classify-claims.js";
import type { RunState } from "../pipeline/state.js";
import { scoreItem, type DevItem, type ItemScore } from "./score.js";

export const DEV_SET_PATH = "evals/dev-set.json";
const RESULTS_DIR = "evals/results";

interface ItemResult {
  item: DevItem;
  result?: Classification;
  error?: string;
  score: ItemScore;
}

export interface ModelSummary {
  model: string;
  total: number;
  passed: number;
  byExpect: Record<DevItem["expect"], { total: number; passed: number }>;
  falseLabels: number;
  errors: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

export async function runEval(options: {
  geo: GeoClient;
  taxonomy: Taxonomy;
  state: RunState;
  models: string[];
  concurrency: number;
}): Promise<ModelSummary[]> {
  const items = (JSON.parse(readFileSync(DEV_SET_PATH, "utf8")) as { items: DevItem[] }).items;
  const claims = await fetchClaims(options.geo, items.map((i) => i.id));
  const claimById = new Map(claims.map((c) => [c.id, c]));
  mkdirSync(RESULTS_DIR, { recursive: true });

  const summaries: ModelSummary[] = [];
  for (const model of options.models) {
    const classifier = new Classifier(options.taxonomy, { model });
    const present = items.filter((i) => claimById.has(i.id));
    const outcomes = await classifyWithCache(
      classifier,
      options.state,
      present.map((i) => ({ claim: claimById.get(i.id)!, spaceId: spaceBySlug(i.space).id })),
      options.concurrency,
    );

    const results: ItemResult[] = items.map((item) => {
      const outcome = outcomes.get(item.id);
      if (!outcome) return { item, error: "claim not found on Geo", score: { pass: false, reason: "claim not found on Geo" } };
      if ("error" in outcome) return { item, error: outcome.error, score: { pass: false, reason: `error: ${outcome.error}` } };
      return { item, result: outcome, score: scoreItem(item, outcome.label, outcome.abstained) };
    });

    const summary = summarize(model, results);
    summaries.push(summary);
    writeFileSync(
      `${RESULTS_DIR}/${model}.${PROMPT_VERSION}.json`,
      JSON.stringify(
        {
          model,
          promptVersion: PROMPT_VERSION,
          taxonomyFingerprint: options.taxonomy.fingerprint,
          summary,
          items: results.map(({ item, result, error, score }) => ({
            id: item.id,
            text: item.text,
            expect: item.expect,
            pass: score.pass,
            reason: score.reason,
            political_leaning: result?.label.political_leaning ?? null,
            ideologies: result?.label.ideologies ?? [],
            confidence: result?.label.confidence ?? null,
            rationale: result?.label.rationale ?? null,
            error: error ?? null,
          })),
        },
        null,
        2,
      ) + "\n",
    );
  }
  writeFileSync(`${RESULTS_DIR}/summary.${PROMPT_VERSION}.md`, renderSummary(summaries));
  return summaries;
}

function summarize(model: string, results: ItemResult[]): ModelSummary {
  const byExpect = { label: { total: 0, passed: 0 }, none: { total: 0, passed: 0 }, either: { total: 0, passed: 0 } };
  let falseLabels = 0;
  for (const { item, result, score } of results) {
    byExpect[item.expect].total++;
    if (score.pass) byExpect[item.expect].passed++;
    if (item.expect === "none" && result && !result.abstained) falseLabels++;
  }
  const ok = results.flatMap((r) => (r.result ? [r.result] : []));
  const avg = (f: (c: Classification) => number) => (ok.length ? Math.round(ok.reduce((s, c) => s + f(c), 0) / ok.length) : 0);
  return {
    model,
    total: results.length,
    passed: results.filter((r) => r.score.pass).length,
    byExpect,
    falseLabels,
    errors: results.filter((r) => r.error).length,
    avgInputTokens: avg((c) => c.usage.inputTokens),
    avgOutputTokens: avg((c) => c.usage.outputTokens),
  };
}

export function renderSummary(summaries: ModelSummary[]): string {
  const pct = (p: number, t: number) => (t ? `${p}/${t} (${Math.round((100 * p) / t)}%)` : "-");
  const lines = [
    `# Dev-set results (prompt ${PROMPT_VERSION})`,
    "",
    "| Model | Overall | Should label | Should be blank | Either | Wrong labels on blank claims | Errors | Avg tokens in/out |",
    "|---|---|---|---|---|---|---|---|",
    ...summaries.map(
      (s) =>
        `| ${s.model} | ${pct(s.passed, s.total)} | ${pct(s.byExpect.label.passed, s.byExpect.label.total)} | ` +
        `${pct(s.byExpect.none.passed, s.byExpect.none.total)} | ${pct(s.byExpect.either.passed, s.byExpect.either.total)} | ` +
        `${s.falseLabels} | ${s.errors} | ${s.avgInputTokens}/${s.avgOutputTokens} |`,
    ),
    "",
  ];
  return lines.join("\n");
}
