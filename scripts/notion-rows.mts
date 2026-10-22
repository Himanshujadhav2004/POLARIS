// Turns a bench result file into Notion page rows for the "Test set and results" database.
// Usage: npx tsx scripts/notion-rows.mts evals/results/bench.<set>.<framework>.json <run-name> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { geoEntityUrl, SPACES } from "../src/config.js";

const [file, run, out] = process.argv.slice(2);
if (!file || !run || !out) throw new Error("usage: notion-rows.mts <bench.json> <run-name> <out.json>");

const bench = JSON.parse(readFileSync(file, "utf8")) as { rows: Record<string, any>[] };
const set = JSON.parse(readFileSync("evals/test-set-v1.json", "utf8")) as { items: Record<string, any>[] };
const items = new Map(set.items.map((i) => [i.id, i]));
const EXPECTED: Record<string, string> = { leaning: "Leaning", either: "Either", uncertain: "Uncertain", no_position: "No political position" };
const clip = (s: string, n = 1900) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const rows = bench.rows.map((r) => {
  const item = items.get(r.id)!;
  const space = SPACES.find((s) => s.slug === item.space);
  return {
    properties: {
      Claim: clip(item.text, 300),
      Category: item.category,
      Space: item.space,
      Synthetic: item.synthetic ? "__YES__" : "__NO__",
      Expected: EXPECTED[item.expect],
      "Acceptable leanings": JSON.stringify(item.leanings),
      "Acceptable ideologies": JSON.stringify(item.ideologies),
      "Expectation note": item.note,
      "Agent result": r.display ?? `Error: ${r.reason}`,
      "Agent ideologies": (r.ideologies as string[]).join(", "),
      ...(r.confidence === null ? {} : { Confidence: r.confidence }),
      Verdict: r.verdict,
      "Confident error": r.confidentError ? "__YES__" : "__NO__",
      Criteria: clip((r.criteria as string[]).join("\n"), 300),
      Explanation: clip(r.explanation ?? "", 420),
      Flags: clip((r.flags as string[]).join("\n"), 220),
      ...(space ? { "Geo link": geoEntityUrl(space.id, item.id) } : {}),
      "Claim ID": item.id,
      Run: run,
    },
  };
});
// Batches of 27 keep each Notion call a manageable size.
const batches: (typeof rows)[] = [];
for (let i = 0; i < rows.length; i += 27) batches.push(rows.slice(i, i + 27));
batches.forEach((b, i) => writeFileSync(out.replace(/\.json$/, `.${i + 1}.json`), JSON.stringify(b)));
console.log(`${rows.length} rows in ${batches.length} batches → ${out.replace(/\.json$/, ".N.json")}`);
