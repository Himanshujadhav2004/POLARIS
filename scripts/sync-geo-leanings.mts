// Brings src/framework/leanings.json in line with Geo's three Leanings types (split on 2026-10-26):
// Political position (formerly Political leaning), Ideological leaning (formerly Ideology) and Issue position.
// For every card: the Geo ID, the Geo name and which of the two types it is, from Geo; the description
// from Armando's Notion doc (the reference for definitions, chosen by the user on 2026-10-26).
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

/** Armando's Notion doc "Leanings" (export of 2026-10-26): the reference for every definition. */
const DOC = "docs/armando/leanings-2026-10-26/ideological-leanings.csv";
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  return rows.filter((r) => r.length > 1);
}
const [header, ...docRows] = parseCsv(readFileSync(DOC, "utf8").replace(/^﻿/, ""));
const col = (name: string) => header!.indexOf(name);
const DOC_DESCRIPTIONS = new Map(docRows.map((r) => [r[col("Geo ID")]!.split("/").pop()!, r[col("Description")]!.trim()]));

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
  // Definitions come from Armando's Notion doc, matched by Geo ID; Geo's own text is not used.
  const description = DOC_DESCRIPTIONS.get(value.id);
  if (!description) throw new Error(`"${name}" (${value.id}) is not in ${DOC}`);
  if (description !== row.description) {
    changes.push(`${name}: description from the Notion doc`);
    row.description = description;
  }
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
