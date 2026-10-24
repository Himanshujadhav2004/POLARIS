// Converts Armando's "Leanings" Notion export into the agent's data and test files.
// Usage: npx tsx scripts/import-leanings.mts [docs/armando/leanings-2026-10-23]
// Writes src/framework/leanings.json (the taxonomy the agent uses) and evals/armando-examples.json
// (his example claim for each leaning, fetched from Geo, as a multi-label test set).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchClaims } from "../src/geo/claims.js";
import { GeoClient } from "../src/geo/client.js";

const dir = process.argv[2] ?? "docs/armando/leanings-2026-10-23";

/** Spelling fixes approved on 2026-10-25 (the user kept "Pro-Taiwan independance" as written). */
const NAME_FIXES: Record<string, string> = {
  "Pro- universal healthcare": "Pro-universal healthcare",
  "Pro Iran containment": "Pro-Iran containment",
  "Pro legalization": "Pro-legalization",
  "Anti legalization": "Anti-legalization",
  "Pro internet freedom": "Pro-internet freedom",
  "Anti zionist": "Anti-Zionist",
};

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  const [header, ...body] = rows.filter((r) => r.length > 1);
  const keys = header!.map((k) => k.replace(/^﻿/, "").trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const lastSegment = (url: string) => (url ? url.split("/").pop()!.split("?")[0]! : null);
const list = (...cells: string[]) => [...new Set(cells.flatMap((c) => c.split(";")).map((s) => s.trim()).filter(Boolean))];
const fixName = (name: string) => NAME_FIXES[name.trim()] ?? name.trim();

const ideologyRows = parseCsv(readFileSync(join(dir, "ideological-leanings.csv"), "utf8"));
const leaningRows = parseCsv(readFileSync(join(dir, "political-leanings.csv"), "utf8"));

const ideologies = ideologyRows.map((r) => {
  const name = fixName(r.Final || r.Name);
  const issue = r.Issue || null;
  return {
    name,
    ...(name !== (r.Final || r.Name).trim() ? { sourceName: (r.Final || r.Name).trim() } : {}),
    kind: issue ? ("issue" as const) : ("tradition" as const),
    description: r.Description,
    issue,
    group: r.Group,
    alternativeNames: list(r["Alternative names"], r["Alternative names (2)"]).filter((a) => a !== name),
    slogan: r.Slogan || null,
    exampleClaimId: lastSegment(r.Exemple),
    geoId: r["Geo status"] === "exists on Geo" ? lastSegment(r["Geo ID"]) : null,
  };
});
// The other side(s) of each issue come from the Issue column: the "Opposing leaning" column uses
// older names that no longer match any row.
const withSides = ideologies.map((i) => ({
  ...i,
  otherSides: i.issue ? ideologies.filter((o) => o.issue === i.issue && o.name !== i.name).map((o) => o.name) : [],
}));

const politicalLeanings = leaningRows
  .map((r) => ({
    name: r.Name,
    description: r["Current description"] || null,
    scale: r["Scale position"] ? Number(r["Scale position"]) : null,
    alternativeNames: list(r["Alternative names"]),
    note: r.Comments || null,
    geoId: r["Geo ID"] || null,
  }))
  .sort((a, b) => (a.scale ?? 99) - (b.scale ?? 99));

const names = withSides.map((i) => i.name);
if (new Set(names).size !== names.length) throw new Error("Duplicate ideology names in the export");
for (const i of withSides) if (i.kind === "issue" && !i.otherSides.length) throw new Error(`${i.name}: its issue has no other side`);

writeFileSync(
  "src/framework/leanings.json",
  JSON.stringify(
    {
      source: `${dir} (Armando's Notion doc "Leanings", completed 2026-10-23)`,
      nameFixes: NAME_FIXES,
      politicalLeanings,
      ideologies: withSides,
    },
    null,
    2,
  ) + "\n",
);

// Armando's example claims: one test item per claim, with every leaning he linked to it.
const byClaim = new Map<string, string[]>();
for (const i of withSides) if (i.exampleClaimId) byClaim.set(i.exampleClaimId, [...(byClaim.get(i.exampleClaimId) ?? []), i.name]);
const claims = new Map((await fetchClaims(new GeoClient(), [...byClaim.keys()])).map((c) => [c.id, c]));
const items = [...byClaim].map(([id, leanings]) => {
  const claim = claims.get(id);
  if (!claim) throw new Error(`Example claim ${id} is not on Geo`);
  return { id, text: claim.text, leanings };
});
writeFileSync(
  "evals/armando-examples.json",
  JSON.stringify(
    {
      version: "armando-examples-v1",
      source: `${dir}, Exemple column: the example claim Armando linked to each ideological leaning`,
      items,
    },
    null,
    2,
  ) + "\n",
);

const count = (k: string) => withSides.filter((i) => i.kind === k).length;
console.log(
  `${count("tradition")} traditions, ${count("issue")} issue leanings across ${new Set(withSides.map((i) => i.issue).filter(Boolean)).size} issues; ` +
    `${politicalLeanings.length} political leanings; ${items.length} example claims`,
);
