import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import type { ScoredClaim, ScoringAgent } from "../agent/v3/agent.js";
import { evidenceFound } from "../agent/v3/score.js";
import { canonicalName, CARD_BY_NAME } from "../framework/ideologies.js";
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
    // A name Geo merged into another (Libertarianism) counts as the value kept.
    item.ideologies = [...new Set(item.ideologies.map(canonicalName))];
    if (ids.has(item.id)) throw new Error(`Duplicate test item ${item.id}`);
    ids.add(item.id);
    for (const name of item.ideologies) if (!CARD_BY_NAME.has(name)) throw new Error(`${item.id}: unknown ideology "${name}"`);
  }
  return set;
}

/**
 * Correct label: something was published and all of it is acceptable.
 * Correct blank: nothing was published, and a blank is acceptable.
 * Missed label: a leaning was expected but none was published (safe, but lost coverage).
 * Wrong label / Wrong ideology: a published label is not acceptable. These must be zero.
 */
export type Verdict = "Correct label" | "Correct blank" | "Missed label" | "Wrong label" | "Wrong ideology";

export interface Judged {
  verdict: Verdict;
  reason: string;
}

/** Compares one result with its expected answer. Only published labels count. */
export function judge(item: TestItem, r: Pick<ScoredClaim, "outcome" | "leaning" | "ideologies">): Judged {
  const given = r.outcome === "leaning" ? r.leaning : null;
  const ideologies = r.ideologies.map((i) => i.name);
  const wrongIdeologies = item.expect === "no_position" ? ideologies : ideologies.filter((n) => !item.ideologies.includes(n));

  const leaningWrong =
    given !== null && (item.expect === "no_position" || item.expect === "uncertain" || !item.leanings.includes(given));
  if (leaningWrong) return { verdict: "Wrong label", reason: `published ${given}; expected ${describe(item)}` };
  if (wrongIdeologies.length) {
    return { verdict: "Wrong ideology", reason: `published ${wrongIdeologies.join(", ")}; acceptable: ${item.ideologies.join(", ") || "none"}` };
  }
  if (item.expect === "leaning" && given === null) return { verdict: "Missed label", reason: `no leaning published; expected ${item.leanings.join(" or ")}` };
  if (given || ideologies.length) return { verdict: "Correct label", reason: [given, ...ideologies].filter(Boolean).join(", ") + " acceptable" };
  return { verdict: "Correct blank", reason: "nothing published, as acceptable" };
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

interface Precision {
  /** Of the leanings published, how many were acceptable. */
  leaningPrecision: { correct: number; given: number };
  /** Of the items that expect a leaning, how many got an acceptable one published. */
  leaningCoverage: { correct: number; expected: number };
  /** Of the ideologies published, how many were acceptable. */
  ideologyPrecision: { correct: number; given: number };
}

export interface BenchSummary extends Precision {
  testSet: string;
  framework: string;
  items: number;
  verdicts: Record<Verdict | "Error", number>;
  /** Wrong labels plus wrong ideologies: the number that must be zero. */
  wrongPublished: number;
  /** The same counts for real Geo claims only (synthetic claims are easier). */
  real: Precision & { items: number; wrongPublished: number };
  /** Claims that got the extra runs (P6), and how many of them gave the same leaning every time. */
  stability: { checked: number; stable: number };
  byCategory: Record<string, Record<Verdict | "Error", number>>;
}

const emptyCounts = (): Record<Verdict | "Error", number> => ({ "Correct label": 0, "Correct blank": 0, "Missed label": 0, "Wrong label": 0, "Wrong ideology": 0, Error: 0 });
const emptyPrecision = (): Precision => ({
  leaningPrecision: { correct: 0, given: 0 },
  leaningCoverage: { correct: 0, expected: 0 },
  ideologyPrecision: { correct: 0, given: 0 },
});

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

  return { rows, summary: summarize(set.version, rows) };
}

export function summarize(testSet: string, rows: BenchRow[]): BenchSummary {
  const summary: BenchSummary = {
    testSet,
    framework: FRAMEWORK_VERSION,
    items: rows.length,
    verdicts: emptyCounts(),
    wrongPublished: 0,
    ...emptyPrecision(),
    real: { items: 0, wrongPublished: 0, ...emptyPrecision() },
    stability: { checked: 0, stable: 0 },
    byCategory: {},
  };
  for (const { item, result, judged } of rows) {
    const cat = (summary.byCategory[item.category] ??= emptyCounts());
    const v = judged?.verdict ?? "Error";
    summary.verdicts[v]++;
    cat[v]++;
    const wrong = v === "Wrong label" || v === "Wrong ideology";
    if (wrong) summary.wrongPublished++;
    if (!item.synthetic) {
      summary.real.items++;
      if (wrong) summary.real.wrongPublished++;
    }
    if (!result) continue;
    count(summary, item, result, judged);
    if (!item.synthetic) count(summary.real, item, result, judged);
    const p6 = result.checks.find((c) => c.id === "P6");
    if (p6 && !p6.skipped) {
      summary.stability.checked++;
      if (p6.pass) summary.stability.stable++;
    }
  }
  return summary;
}

function count(p: Precision, item: TestItem, result: ScoredClaim, judged: Judged | null): void {
  const given = result.outcome === "leaning" ? result.leaning : null;
  if (given) {
    p.leaningPrecision.given++;
    if (judged?.verdict !== "Wrong label") p.leaningPrecision.correct++;
  }
  if (item.expect === "leaning") {
    p.leaningCoverage.expected++;
    if (given && item.leanings.includes(given)) p.leaningCoverage.correct++;
  }
  for (const i of result.ideologies) {
    p.ideologyPrecision.given++;
    if (item.expect !== "no_position" && item.ideologies.includes(i.name)) p.ideologyPrecision.correct++;
  }
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
          synthetic: item.synthetic ?? false,
          expect: item.expect,
          acceptableLeanings: item.leanings,
          acceptableIdeologies: item.ideologies,
          verdict: judged?.verdict ?? "Error",
          reason: judged?.reason ?? error,
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
          flags: result?.flags ?? [],
        })),
      },
      null,
      2,
    ) + "\n",
  );
  return path;
}
