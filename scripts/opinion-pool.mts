// Builds a pool of never-used opinion claims from one space whose text matches a pattern, as a fresh set
// for `fresh-rescore`. Pages through every claim containing each phrase (the API filters on one phrase at
// a time), then keeps those matching the pattern. Used to find claims likely to carry a Political
// ideology (Trump, climate, socialism, religion …).
// Usage: npx tsx scripts/opinion-pool.mts <space> <name> <max> "<regex>" [" should " " must " …]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { IDS, spaceBySlug } from "../src/config.js";
import { FRAMEWORK_VERSION } from "../src/framework/rubric.js";
import { fetchClaims } from "../src/geo/claims.js";
import { GeoClient } from "../src/geo/client.js";
import { usedClaimIds } from "../src/pipeline/fresh-set.js";
import { seededRng, shuffle } from "../src/util/random.js";

const [slug, name, maxArg, pattern, ...phrases] = process.argv.slice(2);
if (!slug || !name || !maxArg || !pattern) throw new Error('usage: opinion-pool.mts <space> <name> <max> "<regex>" [phrase …]');
const space = spaceBySlug(slug);
const out = join("evals/fresh", name, "fresh.json");
if (existsSync(out)) throw new Error(`${out} already exists`);
const match = new RegExp(pattern, "i");

const geo = new GeoClient();
const PAGE = /* GraphQL */ `
  query Page($spaceId: UUID!, $typeId: UUID!, $filter: EntityFilter!, $first: Int!) {
    entities(spaceId: $spaceId, typeId: $typeId, orderBy: [ID_ASC], filter: $filter, first: $first) { id name }
  }
`;
const found = new Map<string, string>();
for (const phrase of phrases.length ? phrases : [" should "]) {
  let last = "0".repeat(32);
  for (;;) {
    const { entities } = await geo.query<{ entities: { id: string; name: string | null }[] }>(PAGE, {
      spaceId: space.id,
      typeId: IDS.claimType,
      filter: { id: { greaterThan: last }, name: { includes: phrase } },
      first: 500,
    });
    for (const e of entities) if (e.name && match.test(e.name)) found.set(e.id, e.name);
    if (entities.length < 500) break;
    last = entities.at(-1)!.id;
  }
}
const used = usedClaimIds();
// A seeded shuffle, so the pool is reproducible and not biased to low IDs.
const fresh = shuffle(
  [...found.keys()].filter((id) => !used.has(id)),
  seededRng(15),
);
const claims = (await fetchClaims(geo, fresh)).filter((c) => c.text && c.spaceIds.includes(space.id) && c.leaningIds.length === 0).slice(0, Number(maxArg));
mkdirSync(join("evals/fresh", name), { recursive: true });
const rows = claims.map((c) => ({ claimId: c.id, space: space.slug, spaceId: space.id, text: c.text, inSample: true }));
writeFileSync(
  out,
  JSON.stringify({ name, seed: 15, framework: FRAMEWORK_VERSION, generatedAt: new Date().toISOString(), note: `Never-used ${space.name} claims containing ${phrases.join(" or ") || '" should "'} and matching /${pattern}/i`, rows }, null, 2) + "\n",
);
console.log(`${found.size} claims match, ${fresh.length} never used, ${rows.length} kept → ${out}`);
