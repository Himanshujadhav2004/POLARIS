// Picks the claims to publish from scored result files (fresh.json / rescore.*.json): every claim the
// current framework published a label on, once. The first batch (for review) is the clearest mix: each
// claim with a Political position and an Issue position, Left and Right alternating, no Issue position
// twice, and a Political ideology where there is one. Writes <out>/batch-1.txt, batch-2.txt and selection.md.
// Usage: npx tsx scripts/publish-select.mts <out-dir> <first-n> <total> <results.json> [<results.json> ...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_BY_NAME } from "../src/framework/ideologies.js";
import { FRAMEWORK_VERSION } from "../src/framework/rubric.js";

const [out, firstArg, totalArg, ...files] = process.argv.slice(2);
if (!out || !firstArg || !totalArg || !files.length) throw new Error("usage: publish-select.mts <out-dir> <first-n> <total> <results.json>...");
const first = Number(firstArg);
const total = Number(totalArg);

interface Row {
  claimId: string;
  space: string;
  text: string;
  error: string | null;
  leaning: string | null;
  ideologies: string[];
  explanation: string | null;
}
// <out>/exclude.txt: claims left out after hand review, one ID per line with "# reason".
const excludeFile = join(out, "exclude.txt");
const excluded = new Set(existsSync(excludeFile) ? readFileSync(excludeFile, "utf8").split(/\r?\n/).map((l) => l.split("#")[0]!.trim()).filter(Boolean) : []);
const rows = new Map<string, Row>();
for (const file of files) {
  const json = JSON.parse(readFileSync(file, "utf8")) as { framework: string; rows: Row[] };
  if (json.framework !== FRAMEWORK_VERSION) throw new Error(`${file} was scored with ${json.framework}, not ${FRAMEWORK_VERSION}`);
  for (const r of json.rows) {
    if (r.space === "us-politics" && !r.error && (r.leaning || r.ideologies.length) && !rows.has(r.claimId) && !excluded.has(r.claimId)) rows.set(r.claimId, r);
  }
}
const split = (r: Row) => ({
  ideology: r.ideologies.find((n) => CARD_BY_NAME.get(n)?.kind === "tradition") ?? null,
  issues: r.ideologies.filter((n) => CARD_BY_NAME.get(n)?.kind === "issue"),
});

// First batch: Political position + Issue position, alternating Left/Right, each Issue position once,
// claims with a Political ideology first.
const full = [...rows.values()].filter((r) => r.leaning && split(r).issues.length).sort((a, b) => Number(!!split(b).ideology) - Number(!!split(a).ideology));
const firstBatch: Row[] = [];
const usedIssues = new Set<string>();
for (const side of Array.from({ length: first * 4 }, (_, i) => (i % 2 ? "Right" : "Left"))) {
  if (firstBatch.length >= first) break;
  const pick = full.find((r) => !firstBatch.includes(r) && r.leaning === side && split(r).issues.every((n) => !usedIssues.has(n)));
  if (!pick) continue;
  firstBatch.push(pick);
  for (const n of split(pick).issues) usedIssues.add(n);
}
const rest = [...rows.values()].filter((r) => !firstBatch.includes(r)).slice(0, Math.max(0, total - firstBatch.length));

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "batch-1.txt"), firstBatch.map((r) => r.claimId).join("\n") + "\n");
writeFileSync(join(out, "batch-2.txt"), rest.map((r) => r.claimId).join("\n") + "\n");
const table = (list: Row[]) => [
  "| # | Claim | Political position | Political ideology | Issue positions |",
  "|---|---|---|---|---|",
  ...list.map((r, i) => `| ${i + 1} | ${r.text.replaceAll("|", "\\|")} | ${r.leaning ?? ""} | ${split(r).ideology ?? ""} | ${split(r).issues.join(", ")} |`),
];
writeFileSync(
  join(out, "selection.md"),
  [
    `# US Politics claims to publish (${FRAMEWORK_VERSION})`,
    "",
    `${rows.size} claims have a published label (${excluded.size} more left out after hand review, see exclude.txt); ${firstBatch.length} in the first batch (for review), ${rest.length} in the second.`,
    "",
    "## Batch 1 (for review)",
    "",
    ...table(firstBatch),
    "",
    "## Batch 2",
    "",
    ...table(rest),
    "",
  ].join("\n"),
);
const count = (list: Row[], f: (r: Row) => boolean) => list.filter(f).length;
const all = [...firstBatch, ...rest];
console.log(`${rows.size} labelled claims. Batch 1: ${firstBatch.length}, batch 2: ${rest.length}.`);
console.log(
  `Of ${all.length}: ${count(all, (r) => !!r.leaning)} with a Political position, ${count(all, (r) => !!split(r).ideology)} with a Political ideology, ${count(all, (r) => split(r).issues.length > 0)} with an Issue position.`,
);
