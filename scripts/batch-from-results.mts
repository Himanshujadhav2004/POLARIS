// Builds a proposal batch from stored, already reviewed results (fresh.json / rescore.*.json) without
// scoring again. The same gates as the dry run: the claim is on Geo, in the space, with no Leanings yet,
// in no other batch; every value exists on Geo with its type; at most one Political position and one
// Ideological leaning per claim. Writes proposals/<space>/batch-NN/.
// Usage: npx tsx scripts/batch-from-results.mts <space> <ids.txt> <results.json> [<results.json> ...]
import { mkdirSync, readFileSync } from "node:fs";
import type { ScoredClaim } from "../src/agent/v3/agent.js";
import { geoEntityUrl, IDS, spaceBySlug } from "../src/config.js";
import { CARD_BY_NAME } from "../src/framework/ideologies.js";
import { fetchClaims } from "../src/geo/claims.js";
import { GeoClient } from "../src/geo/client.js";
import { fetchTaxonomy } from "../src/geo/taxonomy.js";
import { valueIdsFor } from "../src/publish/batch.js";
import { buildLeaningsOps, idsInProposals, nextBatchDir } from "../src/publish/dry-run.js";
import { writeProposalFiles } from "../src/publish/files.js";

const [slug, idsFile, ...files] = process.argv.slice(2);
if (!slug || !idsFile || !files.length) throw new Error("usage: batch-from-results.mts <space> <ids.txt> <results.json>...");
const space = spaceBySlug(slug);
const ids = readFileSync(idsFile, "utf8").split(/\r?\n/).map((l) => l.split("#")[0]!.trim()).filter(Boolean);

interface Row {
  claimId: string;
  text: string;
  leaning: string | null;
  ideologies: string[];
  explanation: string | null;
  error: string | null;
}
const rows = new Map<string, { row: Row; framework: string }>();
for (const file of files) {
  const json = JSON.parse(readFileSync(file, "utf8")) as { framework: string; rows: Row[] };
  for (const row of json.rows) if (!rows.has(row.claimId) && !row.error) rows.set(row.claimId, { row, framework: json.framework });
}
const taken = ids.filter((id) => idsInProposals().has(id));
if (taken.length) throw new Error(`Already in a proposal batch: ${taken.join(", ")}`);

const geo = new GeoClient();
const taxonomy = await fetchTaxonomy(geo);
const claims = new Map((await fetchClaims(geo, ids)).map((c) => [c.id, c]));
const items = ids.map((id) => {
  const stored = rows.get(id);
  const claim = claims.get(id);
  if (!stored) throw new Error(`${id} is in none of the results files`);
  if (!claim) throw new Error(`${id} is not on Geo`);
  if (!claim.spaceIds.includes(space.id)) throw new Error(`${id} is not in ${space.name}`);
  if (claim.leaningIds.length) throw new Error(`${id} already has Leanings`);
  const { row } = stored;
  const kinds = row.ideologies.map((name) => ({ name, kind: CARD_BY_NAME.get(name)?.kind ?? null }));
  if (kinds.some((k) => !k.kind)) throw new Error(`${id}: unknown label in ${row.ideologies.join(", ")}`);
  const result = { claimId: id, leaning: row.leaning, ideologies: kinds } as unknown as ScoredClaim;
  return { claim, row, framework: stored.framework, valueIds: valueIdsFor(result, taxonomy), kinds };
});

const dir = nextBatchDir(space.slug);
mkdirSync(dir, { recursive: true });
const { relations } = buildLeaningsOps(items.map(({ claim, valueIds }) => ({ claim, valueIds, result: null as unknown as ScoredClaim })), taxonomy);
const ops = writeProposalFiles(
  dir,
  {
    space: space.slug,
    spaceId: space.id,
    leaningsPropertyId: IDS.leaningsProperty,
    generatedAt: new Date().toISOString(),
    framework: [...new Set(items.map((i) => i.framework))].join(", "),
    taxonomyFingerprint: taxonomy.fingerprint,
    source: files,
    claims: items.map(({ claim, row, kinds }) => ({
      claimId: claim.id,
      text: claim.text,
      link: geoEntityUrl(space.id, claim.id),
      politicalPosition: row.leaning,
      ideologicalLeaning: kinds.find((k) => k.kind === "tradition")?.name ?? null,
      issuePositions: kinds.filter((k) => k.kind === "issue").map((k) => k.name),
      relations: relations.filter((r) => r.claimId === claim.id),
      explanation: row.explanation ?? "",
    })),
  },
  "Built from stored, reviewed results (no new scoring).",
);
console.log(`Wrote ${dir}: ${items.length} claims, ${ops} Leanings links`);
for (const { claim, row, kinds } of items) console.log(`  ${claim.text}  ->  ${[row.leaning, ...kinds.map((k) => k.name)].filter(Boolean).join(", ")}`);
