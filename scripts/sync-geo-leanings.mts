// Brings src/framework/leanings.json in line with Geo's three Leanings types (split on 2026-10-26):
// Political position (formerly Political leaning), Ideological leaning (formerly Ideology) and Issue position.
// For every card: the Geo ID, the Geo name, which of the two types it is, and Geo's live description.
// A card Geo renamed loses its old alternative names, since several renames changed the meaning
// (Pro-Russia is now "Ukraine aid skeptic"). Usage: npx tsx scripts/sync-geo-leanings.mts
import { readFileSync, writeFileSync } from "node:fs";
import { IDS } from "../src/config.js";
import { RENAMED_ON_GEO } from "../src/framework/renames.js";
import { GeoClient } from "../src/geo/client.js";

const FILE = "src/framework/leanings.json";
/** A side Geo moved from Ideological leaning to Issue position needs an issue of its own. */
const NEW_ISSUES: Record<string, { issue: string; group: string }> = { Isolationist: { issue: "Isolationism", group: "Foreign policy" } };

interface Row {
  name: string;
  kind: string;
  description: string;
  issue: string | null;
  group: string;
  alternativeNames: string[];
  slogan: string | null;
  exampleClaimId: string | null;
  geoId: string | null;
  otherSides: string[];
}
interface Live {
  id: string;
  name: string;
  description: string | null;
}

const geo = new GeoClient();
const live = await geo.query<{ ideologies: Live[]; issues: Live[] }>(
  `query Live($ideology: UUID!, $issue: UUID!) {
    ideologies: entities(typeId: $ideology, first: 200) { id name description }
    issues: entities(typeId: $issue, first: 200) { id name description }
  }`,
  { ideology: IDS.ideologyType, issue: IDS.issuePositionType },
);
const kindOf = new Map<string, "tradition" | "issue">([
  ...live.ideologies.map((v) => [v.name.trim(), "tradition"] as const),
  ...live.issues.map((v) => [v.name.trim(), "issue"] as const),
]);
const byName = new Map([...live.ideologies, ...live.issues].map((v) => [v.name.trim(), v]));

const data = JSON.parse(readFileSync(FILE, "utf8")) as { ideologies: Row[] };
const merged = new Set(["Libertarianism"]);
const changes: string[] = [];
for (const row of data.ideologies) {
  if (merged.has(row.name)) continue;
  const name = RENAMED_ON_GEO[row.name] ?? row.name;
  const value = byName.get(name);
  const kind = kindOf.get(name);
  if (!value || !kind) throw new Error(`"${row.name}" has no Ideological leaning or Issue position named "${name}" on Geo`);
  if (name !== row.name) {
    changes.push(`renamed ${row.name} → ${name}`);
    row.name = name;
    row.alternativeNames = [];
    row.slogan = null;
  }
  if (kind !== row.kind) {
    changes.push(`${name}: ${row.kind} → ${kind}`);
    row.kind = kind;
    row.issue = kind === "issue" ? NEW_ISSUES[name]!.issue : null;
    if (kind === "issue") row.group = NEW_ISSUES[name]!.group;
    row.otherSides = [];
  }
  const description = value.description?.trim() ?? "";
  if (description && description !== row.description) row.description = description;
  row.geoId = value.id;
}
const issueNames = new Set(data.ideologies.filter((r) => r.kind === "issue").map((r) => r.name));
for (const row of data.ideologies) {
  row.otherSides = row.otherSides.map((n) => RENAMED_ON_GEO[n] ?? n).filter((n) => row.kind === "issue" && issueNames.has(n));
}
const names = new Set(data.ideologies.map((r) => r.name));
const missing = [...byName.keys()].filter((n) => !names.has(n));
if (missing.length) throw new Error(`Geo values with no card: ${missing.join(", ")}`);

writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`${changes.length} changes:\n${changes.map((c) => `  ${c}`).join("\n")}`);
console.log(`${live.ideologies.length} Ideological leaning and ${live.issues.length} Issue position values matched.`);
