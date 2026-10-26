import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import type { ScoredClaim, ScoringAgent } from "../agent/v3/agent.js";
import { spaceBySlug } from "../config.js";
import { CARD_BY_NAME } from "../framework/ideologies.js";
import { FRAMEWORK_VERSION, LEANINGS_LEFT_TO_RIGHT } from "../framework/rubric.js";
import type { Claim } from "../geo/claims.js";
import { mapPool } from "../util/pool.js";

/**
 * The challenge set (evals/challenge-set-v1.json): written test claims for the cases that cause wrong
 * labels on real Geo claims (negation, sarcasm, questions, factual health or crypto claims, other
 * countries, news, alternative-name traps, mixed positions) plus clear positives, each with the
 * expected result. A published label outside the expected and acceptable ones counts as wrong.
 */
const Leaning = z.enum(LEANINGS_LEFT_TO_RIGHT as unknown as [string, ...string[]]);
const Challenge = z.object({
  version: z.string(),
  source: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1),
      space: z.string(),
      /** The political leaning to publish; null when the claim should get none. */
      expectLeaning: Leaning.nullable(),
      blankReason: z.string().optional(),
      /** Debatable leanings: reported, never counted as wrong. */
      acceptLeanings: z.array(Leaning),
      expectIdeologies: z.array(z.string()),
      /** Debatable ideological leanings: reported, never counted as wrong. */
      acceptIdeologies: z.array(z.string()),
      note: z.string(),
    }),
  ),
});
export type ChallengeItem = z.infer<typeof Challenge>["items"][number];

export function loadChallenge(path: string): { version: string; items: ChallengeItem[] } {
  const set = Challenge.parse(JSON.parse(readFileSync(path, "utf8")));
  for (const item of set.items) {
    spaceBySlug(item.space);
    for (const name of [...item.expectIdeologies, ...item.acceptIdeologies]) if (!CARD_BY_NAME.has(name)) throw new Error(`${item.id}: unknown leaning "${name}"`);
  }
  return set;
}

/** A challenge claim is not on Geo: it gets a stable ID from its text and the Geo space it is written for. */
export function challengeClaim(item: ChallengeItem): Claim {
  return {
    id: `challenge-${createHash("sha256").update(`${item.space}:${item.text}`).digest("hex").slice(0, 16)}`,
    text: item.text,
    spaceIds: [spaceBySlug(item.space).id],
    isFactual: null,
    context: {},
    leaningIds: [],
  } as Claim;
}

export interface ChallengeJudgement {
  /** A published leaning that is neither expected nor acceptable. */
  wrongLeaning: string | null;
  /** The expected leaning was not published. */
  missedLeaning: boolean;
  /** Published ideological leanings that are neither expected nor acceptable. */
  wrongIdeologies: string[];
  missedIdeologies: string[];
  /** Published labels that are only acceptable (debatable). */
  debatable: string[];
}

export function judgeChallenge(item: ChallengeItem, leaning: string | null, ideologies: string[]): ChallengeJudgement {
  const leaningOk = leaning === null || leaning === item.expectLeaning || item.acceptLeanings.includes(leaning);
  return {
    wrongLeaning: leaningOk ? null : leaning,
    missedLeaning: item.expectLeaning !== null && leaning !== item.expectLeaning,
    wrongIdeologies: ideologies.filter((n) => !item.expectIdeologies.includes(n) && !item.acceptIdeologies.includes(n)),
    missedIdeologies: item.expectIdeologies.filter((n) => !ideologies.includes(n)),
    debatable: [
      ...(leaning && item.acceptLeanings.includes(leaning) && leaning !== item.expectLeaning ? [leaning] : []),
      ...ideologies.filter((n) => item.acceptIdeologies.includes(n) && !item.expectIdeologies.includes(n)),
    ],
  };
}

export interface ChallengeRow {
  item: ChallengeItem;
  result: ScoredClaim | null;
  error: string | null;
  judged: ChallengeJudgement | null;
}

export async function runChallenge(agent: ScoringAgent, items: ChallengeItem[], concurrency: number): Promise<ChallengeRow[]> {
  return mapPool(items, concurrency, async (item): Promise<ChallengeRow> => {
    try {
      const result = await agent.score(challengeClaim(item));
      return { item, result, error: null, judged: judgeChallenge(item, result.leaning, result.ideologies.map((i) => i.name)) };
    } catch (err) {
      return { item, result: null, error: err instanceof Error ? err.message : String(err), judged: null };
    }
  });
}

export interface ChallengeSummary {
  set: string;
  framework: string;
  claims: number;
  errors: number;
  /** Claims with no wrong label and nothing missed. */
  fullyRight: number;
  /** Claims with at least one wrong published label. */
  claimsWithWrongLabel: number;
  wrongLeanings: number;
  wrongIdeologies: number;
  missedLeanings: number;
  missedIdeologies: number;
  debatable: number;
  /** Expected labels (leanings + ideological leanings) and how many were published. */
  expected: number;
  found: number;
}

export function summarizeChallenge(set: string, rows: ChallengeRow[]): ChallengeSummary {
  const s: ChallengeSummary = {
    set,
    framework: FRAMEWORK_VERSION,
    claims: rows.length,
    errors: 0,
    fullyRight: 0,
    claimsWithWrongLabel: 0,
    wrongLeanings: 0,
    wrongIdeologies: 0,
    missedLeanings: 0,
    missedIdeologies: 0,
    debatable: 0,
    expected: 0,
    found: 0,
  };
  for (const { item, judged } of rows) {
    if (!judged) {
      s.errors++;
      continue;
    }
    const wrong = (judged.wrongLeaning ? 1 : 0) + judged.wrongIdeologies.length;
    const missed = (judged.missedLeaning ? 1 : 0) + judged.missedIdeologies.length;
    const expected = (item.expectLeaning ? 1 : 0) + item.expectIdeologies.length;
    s.wrongLeanings += judged.wrongLeaning ? 1 : 0;
    s.wrongIdeologies += judged.wrongIdeologies.length;
    s.missedLeanings += judged.missedLeaning ? 1 : 0;
    s.missedIdeologies += judged.missedIdeologies.length;
    s.debatable += judged.debatable.length;
    s.expected += expected;
    s.found += expected - missed;
    if (wrong) s.claimsWithWrongLabel++;
    if (!wrong && !missed) s.fullyRight++;
  }
  return s;
}

export function writeChallenge(rows: ChallengeRow[], summary: ChallengeSummary): string {
  mkdirSync("evals/results", { recursive: true });
  const path = `evals/results/challenge.${summary.set}.${summary.framework}.json`;
  writeFileSync(
    path,
    JSON.stringify(
      {
        summary,
        rows: rows.map(({ item, result, error, judged }) => ({
          id: item.id,
          space: item.space,
          text: item.text,
          expectLeaning: item.expectLeaning,
          expectIdeologies: item.expectIdeologies,
          error,
          display: result?.display ?? null,
          leaning: result?.leaning ?? null,
          ideologies: result?.ideologies.map((i) => i.name) ?? [],
          ...judged,
          explanation: result?.explanation ?? null,
          droppedIdeologies: result?.droppedIdeologies.map((d) => `${d.name}: ${d.reason}`) ?? [],
          reviewerNotes: result?.reviewerNotes ?? [],
          nearMisses: result?.nearMisses ?? [],
          note: item.note,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  return path;
}
