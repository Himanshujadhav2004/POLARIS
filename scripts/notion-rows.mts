// Turns a result file into Notion page rows, in batches of 27 for notion-create-pages.
// Usage:
//   npx tsx scripts/notion-rows.mts bench evals/results/bench.<set>.<framework>.json <run-name> <out.json>
//   npx tsx scripts/notion-rows.mts fresh evals/fresh/<name>/fresh.json <out.json>
//   npx tsx scripts/notion-rows.mts v3 evals/results/examples.<set>.<framework>.json evals/fresh/<name>/rescore.<framework>.json <run-name> <out.json>
//   npx tsx scripts/notion-rows.mts cards <out.json>   (the Ideology definitions database)
import { readFileSync, writeFileSync } from "node:fs";
import { geoEntityUrl, SPACES } from "../src/config.js";
import { IDEOLOGY_CARDS } from "../src/framework/ideologies.js";

const [mode, file, ...rest] = process.argv.slice(2);
const usage = "usage: notion-rows.mts bench <bench.json> <run-name> <out.json> | fresh <fresh.json> <out.json> | v3 <examples.json> <rescore.json> <run-name> <out.json> | cards <out.json>";
if (!file || !["bench", "fresh", "v3", "cards"].includes(mode ?? "")) throw new Error(usage);

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

/** Framework v3 review rows: Armando's example claims (with his labels) and a re-scored fresh set. */
function v3Rows(freshFile: string, run: string) {
  const US = SPACES.find((s) => s.slug === "us-politics")!;
  const examples = JSON.parse(readFileSync(file!, "utf8")) as { rows: Record<string, any>[] };
  const fresh = JSON.parse(readFileSync(freshFile, "utf8")) as { rows: Record<string, any>[] };
  const common = (r: Record<string, any>, ideologies: string[]) => ({
    Claim: fit(r.text, 300),
    "Political leaning": r.leaning ?? r.display ?? `Error: ${r.error}`,
    "Ideological leanings": ideologies.join(", "),
    Rules: lines(r.checks),
    Explanation: fit(r.explanation ?? ""),
    "Reviewer notes": lines([...(r.droppedIdeologies ?? []).map((d: string) => `Not published: ${d}`), ...r.reviewerNotes]),
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
    // Fresh claims with no political position are already in "Fresh QA sample"; only labelled or blocked ones are added.
    ...fresh.rows.filter((r) => r.published || String(r.display ?? "").startsWith("No label")).map((r) => ({
      properties: {
        ...common(r, r.ideologies),
        Set: "Fresh sample",
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
    Libertarian: "Near-duplicate of Libertarianism. Both are used, so a claim can get both: should one be preferred?",
    Libertarianism: "Near-duplicate of Libertarian. Both are used, so a claim can get both: should one be preferred?",
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
      ].join(" "),
    },
  }));
}

const rows = mode === "bench" ? benchRows(rest[0] ?? "") : mode === "v3" ? v3Rows(rest[0] ?? "", rest[1] ?? "") : mode === "cards" ? cardRows() : freshRows();
const out = mode === "bench" ? rest[1] : mode === "v3" ? rest[2] : mode === "cards" ? file : rest[0];
if (!out || (mode === "bench" && !rest[0])) throw new Error(usage);
const batches: (typeof rows)[] = [];
for (let i = 0; i < rows.length; i += 27) batches.push(rows.slice(i, i + 27));
batches.forEach((b, i) => writeFileSync(out.replace(/\.json$/, `.${i + 1}.json`), JSON.stringify(b)));
console.log(`${rows.length} rows in ${batches.length} batches → ${out.replace(/\.json$/, ".N.json")}`);
