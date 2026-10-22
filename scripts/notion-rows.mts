// Turns a result file into Notion page rows, in batches of 27 for notion-create-pages.
// Usage:
//   npx tsx scripts/notion-rows.mts bench evals/results/bench.<set>.<framework>.json <run-name> <out.json>
//   npx tsx scripts/notion-rows.mts fresh evals/fresh/<name>/fresh.json <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { geoEntityUrl, SPACES } from "../src/config.js";

const [mode, file, ...rest] = process.argv.slice(2);
const usage = "usage: notion-rows.mts bench <bench.json> <run-name> <out.json> | fresh <fresh.json> <out.json>";
if (!file || (mode !== "bench" && mode !== "fresh")) throw new Error(usage);

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

const rows = mode === "bench" ? benchRows(rest[0] ?? "") : freshRows();
const out = mode === "bench" ? rest[1] : rest[0];
if (!out || (mode === "bench" && !rest[0])) throw new Error(usage);
const batches: (typeof rows)[] = [];
for (let i = 0; i < rows.length; i += 27) batches.push(rows.slice(i, i + 27));
batches.forEach((b, i) => writeFileSync(out.replace(/\.json$/, `.${i + 1}.json`), JSON.stringify(b)));
console.log(`${rows.length} rows in ${batches.length} batches → ${out.replace(/\.json$/, ".N.json")}`);
