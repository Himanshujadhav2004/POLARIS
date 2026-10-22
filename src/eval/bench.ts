import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import type { ScoredClaim, ScoringAgent } from "../agent/v3/agent.js";
import { evidenceFound } from "../agent/v3/score.js";
import { CARD_BY_NAME } from "../framework/ideologies.js";
import { FRAMEWORK_VERSION, LEANINGS_LEFT_TO_RIGHT } from "../framework/rubric.js";
import { fetchClaims, type Claim } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import { mapPool } from "../util/pool.js";

const Leaning = z.enum(LEANINGS_LEFT_TO_RIGHT as [string, ...string[]]);

const TestItem = z.object({
  id: z.string(),
  space: z.string(),
  category: z.string(),
  text: z.string(),
  synthetic: z.boolean().optional(),
  expect: z.enum(["leaning", "either", "uncertain", "no_position"]),
  leanings: z.array(Leaning),
  ideologies: z.array(z.string()),
  note: z.string(),
});
export type TestItem = z.infer<typeof TestItem>;

const TestSet = z.object({ version: z.string(), items: z.array(TestItem) });
export type TestSet = z.infer<typeof TestSet>;

export function loadTestSet(path: string): TestSet {
  const set = TestSet.parse(JSON.parse(readFileSync(path, "utf8")));
  const ids = new Set<string>();
  for (const item of set.items) {
    if (ids.has(item.id)) throw new Error(`Duplicate test item ${item.id}`);
    ids.add(item.id);
    for (const name of item.ideologies) if (!CARD_BY_NAME.has(name)) throw new Error(`${item.id}: unknown ideology "${name}"`);
  }
  return set;
}

export type Verdict = "Correct" | "Safe miss" | "Wrong label" | "Wrong ideology";

export interface Judged {
  verdict: Verdict;
  reason: string;
  /** A wrong result that was marked Clear: the error that must never happen. */
  confidentError: boolean;
}

/** Compares one result with its expected answer. */
export function judge(item: TestItem, r: Pick<ScoredClaim, "outcome" | "leaning" | "qualifier" | "ideologies">): Judged {
  const given = r.outcome === "leaning" ? r.leaning : null;
  const ideologies = r.ideologies.map((i) => i.name);
  const wrongIdeologies = item.expect === "no_position" ? ideologies : ideologies.filter((n) => !item.ideologies.includes(n));
  const clearIdeology = r.ideologies.some((i) => wrongIdeologies.includes(i.name) && i.qualifier === "Clear");

  const leaningWrong =
    given !== null && (item.expect === "no_position" || item.expect === "uncertain" || !item.leanings.includes(given));
  if (leaningWrong) {
    return { verdict: "Wrong label", reason: `gave ${given}; expected ${describe(item)}`, confidentError: r.qualifier === "Clear" };
  }
  if (wrongIdeologies.length) {
    return { verdict: "Wrong ideology", reason: `gave ${wrongIdeologies.join(", ")}; acceptable: ${item.ideologies.join(", ") || "none"}`, confidentError: clearIdeology };
  }
  if (item.expect === "leaning" && given === null) {
    return { verdict: "Safe miss", reason: `no leaning given; expected ${item.leanings.join(" or ")}`, confidentError: false };
  }
  return { verdict: "Correct", reason: given ? `${given} is acceptable` : "no leaning, as acceptable", confidentError: false };
}

function describe(item: TestItem): string {
  if (item.expect === "no_position") return "no political position";
  if (item.expect === "uncertain" || !item.leanings.length) return "no leaning";
  return item.leanings.join(" or ");
}

export interface BenchRow {
  item: TestItem;
  result: ScoredClaim | null;
  error: string | null;
  judged: Judged | null;
}

export interface BenchSummary {
  testSet: string;
  framework: string;
  items: number;
  verdicts: Record<Verdict | "Error", number>;
  confidentErrors: number;
  /** Of the leanings the agent gave, the share that were acceptable. */
  leaningPrecision: { correct: number; given: number };
  /** Of the items that expect a leaning, the share that got an acceptable one. */
  leaningCoverage: { correct: number; expected: number };
  ideologyPrecision: { correct: number; given: number };
  byCategory: Record<string, Record<Verdict | "Error", number>>;
}

const emptyCounts = (): Record<Verdict | "Error", number> => ({ Correct: 0, "Safe miss": 0, "Wrong label": 0, "Wrong ideology": 0, Error: 0 });

/** Real claims must still read as the test set recorded them; returns mismatches. */
export function checkTexts(items: TestItem[], claims: Map<string, Claim>): string[] {
  return items
    .filter((i) => !i.synthetic)
    .flatMap((i) => {
      const c = claims.get(i.id);
      if (!c) return [`${i.id}: not found on Geo`];
      return evidenceFound(c.text, i.text) && evidenceFound(i.text, c.text) ? [] : [`${i.id}: text on Geo differs ("${c.text}")`];
    });
}

export async function runBench(geo: GeoClient, agent: ScoringAgent, set: TestSet, concurrency: number): Promise<{ rows: BenchRow[]; summary: BenchSummary }> {
  const real = set.items.filter((i) => !i.synthetic);
  const fetched = new Map((await fetchClaims(geo, real.map((i) => i.id))).map((c) => [c.id, c]));
  const mismatches = checkTexts(set.items, fetched);
  if (mismatches.length) throw new Error(`Test set does not match Geo:\n${mismatches.join("\n")}`);

  const rows = await mapPool(set.items, concurrency, async (item): Promise<BenchRow> => {
    const claim: Claim = item.synthetic
      ? { id: item.id, text: item.text, spaceIds: [], isFactual: null, context: {}, leaningIds: [] }
      : fetched.get(item.id)!;
    try {
      const result = await agent.score(claim);
      return { item, result, error: null, judged: judge(item, result) };
    } catch (err) {
      return { item, result: null, error: err instanceof Error ? err.message : String(err), judged: null };
    }
  });

  const summary: BenchSummary = {
    testSet: set.version,
    framework: FRAMEWORK_VERSION,
    items: rows.length,
    verdicts: emptyCounts(),
    confidentErrors: 0,
    leaningPrecision: { correct: 0, given: 0 },
    leaningCoverage: { correct: 0, expected: 0 },
    ideologyPrecision: { correct: 0, given: 0 },
    byCategory: {},
  };
  for (const { item, result, judged } of rows) {
    const cat = (summary.byCategory[item.category] ??= emptyCounts());
    const v = judged?.verdict ?? "Error";
    summary.verdicts[v]++;
    cat[v]++;
    if (judged?.confidentError) summary.confidentErrors++;
    if (!result) continue;
    const given = result.outcome === "leaning" ? result.leaning : null;
    if (given) {
      summary.leaningPrecision.given++;
      if (judged?.verdict !== "Wrong label") summary.leaningPrecision.correct++;
    }
    if (item.expect === "leaning") {
      summary.leaningCoverage.expected++;
      if (given && item.leanings.includes(given)) summary.leaningCoverage.correct++;
    }
    for (const i of result.ideologies) {
      summary.ideologyPrecision.given++;
      if (item.expect !== "no_position" && item.ideologies.includes(i.name)) summary.ideologyPrecision.correct++;
    }
  }
  return { rows, summary };
}

export function writeBench(rows: BenchRow[], summary: BenchSummary): string {
  mkdirSync("evals/results", { recursive: true });
  const path = `evals/results/bench.${summary.testSet}.${summary.framework}.json`;
  writeFileSync(
    path,
    JSON.stringify(
      {
        summary,
        rows: rows.map(({ item, result, error, judged }) => ({
          id: item.id,
          category: item.category,
          text: item.text,
          expect: item.expect,
          acceptableLeanings: item.leanings,
          acceptableIdeologies: item.ideologies,
          verdict: judged?.verdict ?? "Error",
          reason: judged?.reason ?? error,
          confidentError: judged?.confidentError ?? false,
          display: result?.display ?? null,
          ideologies: result?.ideologies.map((i) => `${i.name} (${i.qualifier})`) ?? [],
          confidence: result?.confidence?.total ?? null,
          criteria: result?.criteria.map((c) => `${c.id}: "${c.evidence}"`) ?? [],
          explanation: result?.explanation ?? null,
          flags: result?.flags ?? [],
        })),
      },
      null,
      2,
    ) + "\n",
  );
  return path;
}
