// Builds the pool of claims to publish to one space: every claim an earlier run gave a label, that Geo
// still shows in the space with no Leanings yet. Written as a fresh set, so `fresh-rescore` scores it
// with the current framework: npx tsx scripts/publish-pool.mts us-politics publish-pool-us
//   then: npm run cli -- fresh-rescore --dir publish-pool-us
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spaceBySlug } from "../src/config.js";
import { FRAMEWORK_VERSION } from "../src/framework/rubric.js";
import { fetchClaims } from "../src/geo/claims.js";
import { GeoClient } from "../src/geo/client.js";
import { idsInProposals } from "../src/publish/dry-run.js";

const [slug, name] = process.argv.slice(2);
if (!slug || !name) throw new Error("usage: publish-pool.mts <space> <name>");
const space = spaceBySlug(slug);
const out = join("evals/fresh", name, "fresh.json");
if (existsSync(out)) throw new Error(`${out} already exists`);

interface Row {
  claimId?: string;
  id?: string;
  space?: string;
  spaceId?: string;
  leaning?: string | null;
  ideologies?: string[];
}
const labelled = new Set<string>();
const otherSpace = new Set<string>();
const walk = (dir: string) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (path.endsWith(".json")) {
      const json = JSON.parse(readFileSync(path, "utf8")) as { rows?: Row[] };
      for (const r of json.rows ?? []) {
        const id = r.claimId ?? r.id;
        // Geo claim IDs only: written test claims have IDs such as "text-…" or "synthetic-…".
        if (!id || !/^[0-9a-f]{32}$/.test(id)) continue;
        if ((r.space && r.space !== space.slug) || (r.spaceId && r.spaceId !== space.id)) otherSpace.add(id);
        else if (r.leaning || r.ideologies?.length) labelled.add(id);
      }
    }
  }
};
for (const root of ["evals/fresh", "evals/results", "evals/showcase"]) walk(root);

const proposed = idsInProposals();
const ids = [...labelled].filter((id) => !otherSpace.has(id) && !proposed.has(id));
const claims = (await fetchClaims(new GeoClient(), ids)).filter((c) => c.text && c.spaceIds.includes(space.id) && c.leaningIds.length === 0);
mkdirSync(join("evals/fresh", name), { recursive: true });
const rows = claims.map((c) => ({ claimId: c.id, space: space.slug, spaceId: space.id, text: c.text, inSample: true }));
writeFileSync(
  out,
  JSON.stringify({ name, seed: null, framework: FRAMEWORK_VERSION, generatedAt: new Date().toISOString(), note: `Claims an earlier run labelled, in ${space.name} with no Leanings on Geo`, rows }, null, 2) + "\n",
);
console.log(`${labelled.size} labelled claims found, ${ids.length} not ruled out, ${rows.length} in ${space.name} without Leanings → ${out}`);
