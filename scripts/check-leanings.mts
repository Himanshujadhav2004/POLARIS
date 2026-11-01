// Reads back from Geo every Leanings relation in a space and reports it by claim and by type.
// Independent of the local proposal files: it asks Geo what is actually there.
// Usage: npx tsx scripts/check-leanings.mts [space=us-politics] [proposalId ...]
import { IDS, spaceBySlug } from "../src/config.js";
import { GeoClient } from "../src/geo/client.js";

const [slug = "us-politics", ...proposalIds] = process.argv.slice(2);
const space = spaceBySlug(slug);
const geo = new GeoClient();

const TYPE_NAMES: Record<string, string> = {
  [IDS.politicalLeaningType]: "Political position",
  [IDS.ideologyType]: "Ideological leaning",
  [IDS.issuePositionType]: "Issue position",
};

for (const id of proposalIds) {
  const bare = id.replace(/^0x/, "");
  const d = await geo.query<{ proposal: { executedAt: string | null; createdAt: string; proposalVersions: { name: string }[] } | null }>(
    `query P($id: UUID!) { proposal(id: $id) { executedAt createdAt proposalVersions { name } } }`,
    { id: bare },
  );
  const p = d.proposal;
  if (!p) console.log(`proposal ${id}: not found on Geo`);
  else console.log(`proposal ${id}: ${p.proposalVersions[0]?.name ?? "?"} — ${p.executedAt ? `executed ${new Date(Number(p.executedAt) * 1000).toISOString()}` : "NOT executed yet"}`);
}

// Every Leanings relation in the space, paged by relation id.
interface Rel {
  id: string;
  fromEntityId: string;
  fromEntity: { name: string | null } | null;
  toEntity: { id: string; name: string | null; types: { id: string }[] } | null;
}
const rels: Rel[] = [];
let after = "0".repeat(32);
for (;;) {
  const page = await geo.query<{ relations: Rel[] }>(
    `query R($type: UUID!, $space: UUID!, $after: UUID!, $first: Int!) {
      relations(filter: { typeId: { is: $type }, spaceId: { is: $space }, id: { greaterThan: $after } }, orderBy: [ID_ASC], first: $first) {
        id fromEntityId fromEntity { name } toEntity { id name types { id } }
      }
    }`,
    { type: IDS.leaningsProperty, space: space.id, after, first: 500 },
  );
  rels.push(...page.relations);
  if (page.relations.length < 500) break;
  after = page.relations.at(-1)!.id;
}

const byClaim = new Map<string, { name: string; values: { name: string; type: string }[] }>();
for (const r of rels) {
  const type = r.toEntity?.types.map((t) => TYPE_NAMES[t.id]).find(Boolean) ?? "OTHER TYPE";
  const entry = byClaim.get(r.fromEntityId) ?? { name: r.fromEntity?.name ?? "(no name)", values: [] };
  entry.values.push({ name: r.toEntity?.name ?? "(no name)", type });
  byClaim.set(r.fromEntityId, entry);
}

const count = (e: { values: { type: string }[] }, t: string) => e.values.filter((v) => v.type === t).length;
let allThree = 0;
let broken = 0;
console.log(`\n${rels.length} Leanings relations on ${byClaim.size} claims in ${space.name}\n`);
for (const [id, e] of byClaim) {
  const pos = e.values.filter((v) => v.type === "Political position").map((v) => v.name);
  const ide = e.values.filter((v) => v.type === "Ideological leaning").map((v) => v.name);
  const iss = e.values.filter((v) => v.type === "Issue position").map((v) => v.name);
  const other = e.values.filter((v) => v.type === "OTHER TYPE").map((v) => v.name);
  const three = pos.length === 1 && ide.length === 1 && iss.length >= 1;
  if (three) allThree++;
  const problems = [pos.length > 1 && `${pos.length} Political positions`, ide.length > 1 && `${ide.length} Ideological leanings`, other.length && `not a Leanings type: ${other.join(", ")}`].filter(Boolean);
  if (problems.length) broken++;
  console.log(`${three ? "OK  " : "    "} ${e.name?.slice(0, 58).padEnd(58)} | ${(pos[0] ?? "-").padEnd(12)} | ${(ide[0] ?? "-").padEnd(22)} | ${iss.join(", ") || "-"}${problems.length ? `   <-- ${problems.join("; ")}` : ""}`);
}
console.log(`\n${byClaim.size} claims carry Leanings; ${allThree} have all three types; ${broken} have a problem.`);
console.log(`Totals by type: ${["Political position", "Ideological leaning", "Issue position", "OTHER TYPE"].map((t) => `${t} ${[...byClaim.values()].reduce((a, e) => a + count(e, t), 0)}`).join(", ")}`);
