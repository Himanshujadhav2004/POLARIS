// Turns a result file into Notion page rows, in batches of 27 for notion-create-pages.
// Usage:
//   npx tsx scripts/notion-rows.mts bench evals/results/bench.<set>.<framework>.json <run-name> <out.json>
//   npx tsx scripts/notion-rows.mts fresh evals/fresh/<name>/fresh.json <out.json>
//   npx tsx scripts/notion-rows.mts v3 evals/results/examples.<set>.<framework>.json <fresh-or-rescore.json>[,<more.json>] <run-name> <out.json>
//   npx tsx scripts/notion-rows.mts cards <out.json>   (the Ideology definitions database)
//   npx tsx scripts/notion-rows.mts challenge evals/results/challenge.<set>.<framework>.json[,<baseline.json>] <run-name> <out.json>
//   npx tsx scripts/notion-rows.mts showcase evals/fresh/<name>/fresh.json <out.json>   (one row per claim, for presenting a run)
import { readFileSync, writeFileSync } from "node:fs";
import { geoEntityUrl, SPACES } from "../src/config.js";
import { EXCLUDED_ALIASES, IDEOLOGY_CARDS } from "../src/framework/ideologies.js";
import { LEANINGS_LEFT_TO_RIGHT } from "../src/framework/rubric.js";

const [mode, file, ...rest] = process.argv.slice(2);
const usage =
  "usage: notion-rows.mts bench <bench.json> <run-name> <out.json> | fresh <fresh.json> <out.json> | v3 <examples.json> <rescore.json> <run-name> <out.json> | cards <out.json> | challenge <challenge.json> <run-name> <out.json> | showcase <fresh.json> <out.json>";
if (!file || !["bench", "fresh", "v3", "cards", "challenge", "showcase"].includes(mode ?? "")) throw new Error(usage);

/** Notion text properties hold 2000 characters; cut at the last full sentence, never mid-sentence. */
function fit(s: string, max = 1900): string {
  if (s.length <= max) return s;
  const end = s.lastIndexOf(". ", max - 40);
  return `${s.slice(0, end > 0 ? end + 1 : max - 40)} (continued in the results file)`;
}
const lines = (xs: string[]) => fit(xs.join("\n"));

function benchRows(run: string) {
  const bench = JSON.parse(readFileSync(file!, "utf8")) as { rows: Record<string, any>[] };
  const set = JSON.parse(readFileSync("evals/test-set-v1.json", "utf8")) as { items: Record<string, any>[] };
  const items = new Map(set.items.map((i) => [i.id, i]));
  const EXPECTED: Record<string, string> = { leaning: "Leaning", either: "Either", uncertain: "Uncertain", no_position: "No political position" };
  return bench.rows.map((r) => {
    const item = items.get(r.id)!;
    const space = SPACES.find((s) => s.slug === item.space);
    return {
      properties: {
        Claim: fit(item.text, 300),
        Category: item.category,
        Space: item.space,
        Synthetic: item.synthetic ? "__YES__" : "__NO__",
        Expected: EXPECTED[item.expect],
        "Acceptable leanings": JSON.stringify(item.leanings),
        "Acceptable ideologies": JSON.stringify(item.ideologies),
        "Expectation note": item.note,
        "Agent result": r.display ?? `Error: ${r.reason}`,
        "Agent ideologies": (r.ideologies as string[]).join(", "),
        Verdict: r.verdict,
        Criteria: lines(r.criteria),
        Rules: lines(r.checks),
        Explanation: fit(r.explanation ?? ""),
        "Reviewer notes": lines(r.reviewerNotes),
        Flags: lines(r.flags),
        ...(space ? { "Geo link": geoEntityUrl(space.id, item.id) } : {}),
        "Claim ID": item.id,
        Run: run,
      },
    };
  });
}

function freshRows() {
  const fresh = JSON.parse(readFileSync(file!, "utf8")) as { name: string; rows: Record<string, any>[] };
  // Rows with a published label all go to review; blanks only when they are in the 10-per-space sample.
  return fresh.rows
    .filter((r) => r.inSample || r.published)
    .map((r) => ({
      properties: {
        Claim: fit(r.text, 300),
        Space: r.space,
        "In 10-per-space sample": r.inSample ? "__YES__" : "__NO__",
        Published: r.published ? "__YES__" : "__NO__",
        "Agent result": r.display ?? `Error: ${r.error}`,
        "Agent ideologies": (r.ideologies as string[]).join(", "),
        Criteria: lines(r.criteria),
        Rules: lines(r.checks),
        Explanation: fit(r.explanation ?? ""),
        "Reviewer notes": lines(r.reviewerNotes),
        "Geo link": geoEntityUrl(r.spaceId, r.claimId),
        "Claim ID": r.claimId,
        Run: fresh.name,
      },
    }));
}

/** Framework v3 review rows: Armando's example claims (with his labels) and one or more fresh or re-scored sets. */
function v3Rows(freshFiles: string, run: string) {
  const US = SPACES.find((s) => s.slug === "us-politics")!;
  const examples = JSON.parse(readFileSync(file!, "utf8")) as { rows: Record<string, any>[] };
  const fresh = {
    rows: freshFiles.split(",").flatMap((f) => {
      const set = JSON.parse(readFileSync(f, "utf8")) as { name: string; rows: Record<string, any>[] };
      return set.rows.map((r) => ({ ...r, setName: set.name }));
    }),
  };
  const common = (r: Record<string, any>, ideologies: string[]) => ({
    Claim: fit(r.text, 300),
    "Political leaning": r.leaning ?? r.display ?? `Error: ${r.error}`,
    "Ideological leanings": ideologies.join(", "),
    Rules: lines(r.checks),
    Explanation: fit(r.explanation ?? ""),
    "Reviewer notes": lines([...(r.droppedIdeologies ?? []).map((d: string) => `Not published: ${d}`), ...r.reviewerNotes]),
    "Near misses": lines(r.nearMisses ?? []),
    Run: run,
  });
  return [
    ...examples.rows.map((r) => ({
      properties: {
        ...common(r, r.published),
        Set: "Armando example",
        Space: "us-politics",
        "Armando's leanings": (r.armando as string[]).join(", "),
        Matched: (r.matched as string[]).join(", "),
        "Not in Armando's labels": (r.extra as string[]).join(", "),
        Missed: (r.missed as string[]).join(", "),
        "Geo link": geoEntityUrl(US.id, r.id),
        "Claim ID": r.id,
      },
    })),
    // Held-out claims: only those with a published label or a near miss, the ones a reviewer has to judge.
    ...fresh.rows.filter((r) => r.published || r.nearMisses?.length).map((r) => ({
      properties: {
        ...common(r, r.ideologies),
        Set: "Fresh sample",
        Run: `${run} · ${r.setName}`,
        Space: r.space,
        "Geo link": geoEntityUrl(r.spaceId, r.claimId),
        "Claim ID": r.claimId,
      },
    })),
  ];
}

/** One row per ideological leaning card (framework v3), as the agent uses it. */
function cardRows() {
  const US = SPACES.find((s) => s.slug === "us-politics")!;
  const NOTES: Record<string, string> = {
    Libertarian: "Geo removed its near-duplicate Libertarianism on 2026-10-26; that name is now another name for Libertarian (v3.4.1).",
    Deaccelerationist: "Name kept as written in the doc.",
    "Pro-Taiwan independance": "Name kept as written in the doc.",
  };
  return IDEOLOGY_CARDS.map((c) => ({
    properties: {
      Ideology: c.name,
      Kind: c.kind === "issue" ? "Issue leaning" : "Tradition",
      Issue: c.issue,
      Group: c.group,
      Definition: fit(c.definition),
      "Core beliefs": lines(c.tenets.map((t) => `${t.id} ${t.text}`)),
      "Not this ideology when": lines(c.exclusions),
      Neighbours: c.neighbours.join(", "),
      "Usually found at": JSON.stringify(c.kind === "issue" ? [] : c.typicalLeanings),
      "Also called": c.aliases.join("; "),
      "On Geo": c.geoId ? "__YES__" : "__NO__",
      "Geo ID": c.geoId,
      "Example claim": c.exampleClaimId ? geoEntityUrl(US.id, c.exampleClaimId) : null,
      Source: c.source,
      Status: c.status,
      "Review notes": [
        c.kind === "issue"
          ? "Framework v3.0: the definition is the side itself."
          : "Framework v3.0: the definition is Armando's; the characteristic positions, exclusions, related traditions and leanings are drafts for rule I2.",
        ...(c.geoId ? [] : ["Not on Geo yet: labelled in results, never put in a Geo proposal."]),
        ...(NOTES[c.name] ? [NOTES[c.name]!] : []),
        ...(EXCLUDED_ALIASES[c.name]
          ? [`Left out of the prompts (v3.4), because they contradict this side or name another leaning: ${EXCLUDED_ALIASES[c.name]!.join("; ")}.`]
          : []),
      ].join(" "),
    },
  }));
}

/** Challenge set rows: the expected result next to the agent's, with wrong and missed labels. */
function challengeRows(run: string) {
  const [resultFile, baselineFile] = file!.split(",");
  const result = JSON.parse(readFileSync(resultFile!, "utf8")) as { rows: Record<string, any>[] };
  const baseline = baselineFile ? new Map((JSON.parse(readFileSync(baselineFile, "utf8")) as { rows: Record<string, any>[] }).rows.map((r) => [r.id, r])) : null;
  return result.rows.map((r) => {
    const before = baseline?.get(r.id);
    const wrong = [...(r.wrongLeaning ? [r.wrongLeaning] : []), ...(r.wrongIdeologies ?? [])];
    const missed = [...(r.missedLeaning ? [r.expectLeaning] : []), ...(r.missedIdeologies ?? [])];
    return {
      properties: {
        Claim: fit(r.text, 300),
        "userDefined:ID": r.id,
        Space: r.space,
        "Expected leaning": r.expectLeaning ?? "No leaning",
        "Expected ideologies": (r.expectIdeologies as string[]).join(", "),
        "Agent result": r.display ?? `Error: ${r.error}`,
        "Agent ideologies": (r.ideologies as string[]).join(", "),
        Result: r.error ? "Error" : wrong.length ? "Wrong label" : missed.length ? "Missed" : "Right",
        Wrong: wrong.join(", "),
        Missed: missed.join(", "),
        Debatable: (r.debatable as string[]).join(", "),
        Explanation: fit(r.explanation ?? ""),
        "Reviewer notes": lines([...(r.droppedIdeologies ?? []).map((d: string) => `Not published: ${d}`), ...(r.reviewerNotes ?? [])]),
        "Near misses": lines(r.nearMisses ?? []),
        "Expectation note": r.note ?? "",
        ...(before ? { "Baseline result": `${before.display}${before.ideologies.length ? ` · ${before.ideologies.join(", ")}` : ""}` } : {}),
        Run: run,
      },
    };
  });
}

/** Every claim of a run, in plain terms, for presenting it: claim, space, results, explanation, links. */
function showcaseRows() {
  const run = JSON.parse(readFileSync(file!, "utf8")) as { rows: Record<string, any>[] };
  const outcome = (r: Record<string, any>) =>
    r.error ? "Error" : r.published ? "Labelled" : String(r.display).startsWith("No political position") ? "No political position" : "No label";
  // Labelled claims first, then blanks; within each, Geo spaces in the usual order. Rows collected by
  // scripts/showcase.mts are all labelled: they go from left to right, Armando's examples first.
  const curated = run.rows.some((r) => r.source);
  const rank = ["Labelled", "No label", "No political position", "Error"];
  const space = (r: Record<string, any>) => SPACES.findIndex((s) => s.slug === r.space);
  const level = (r: Record<string, any>) => LEANINGS_LEFT_TO_RIGHT.indexOf(r.leaning);
  const armandoFirst = (r: Record<string, any>) => (String(r.source).startsWith("Armando") ? 0 : 1);
  const sorted = [...run.rows].sort((a, b) =>
    curated
      ? level(a) - level(b) || armandoFirst(a) - armandoFirst(b)
      : rank.indexOf(outcome(a)) - rank.indexOf(outcome(b)) || space(a) - space(b),
  );
  return sorted.map((r) => ({
    properties: {
      Claim: fit(r.text, 300),
      Space: SPACES.find((s) => s.slug === r.space)?.name ?? r.space,
      "Political leaning": r.leaning ?? "—",
      "Ideological leanings": (r.ideologies as string[]).length ? (r.ideologies as string[]).join(", ") : "—",
      ...(curated ? {} : { Outcome: outcome(r) }),
      Explanation: fit(r.explanation ?? `Error: ${r.error}`),
      "Claim ID": r.claimId,
      "Geo link": geoEntityUrl(r.spaceId, r.claimId),
      // Rows collected by scripts/showcase.mts also say where each claim came from.
      ...(r.source ? { Source: r.source.startsWith("Armando") ? "Armando's example" : "Geo sample" } : {}),
      ...(r.armando ? { "Armando's labels": (r.armando as string[]).join(", ") } : {}),
    },
  }));
}

const rows =
  mode === "bench"
    ? benchRows(rest[0] ?? "")
    : mode === "v3"
      ? v3Rows(rest[0] ?? "", rest[1] ?? "")
      : mode === "cards"
        ? cardRows()
        : mode === "challenge"
          ? challengeRows(rest[0] ?? "")
          : mode === "showcase"
            ? showcaseRows()
            : freshRows();
const out = mode === "bench" || mode === "challenge" ? rest[1] : mode === "v3" ? rest[2] : mode === "cards" ? file : rest[0];
if (!out || ((mode === "bench" || mode === "challenge") && !rest[0])) throw new Error(usage);
const batches: (typeof rows)[] = [];
for (let i = 0; i < rows.length; i += 27) batches.push(rows.slice(i, i + 27));
batches.forEach((b, i) => writeFileSync(out.replace(/\.json$/, `.${i + 1}.json`), JSON.stringify(b)));
console.log(`${rows.length} rows in ${batches.length} batches → ${out.replace(/\.json$/, ".N.json")}`);
