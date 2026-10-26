// Keeps only some claims of an unsent proposal batch, without scoring again: the labels stay exactly as
// the dry run wrote them. Rewrites proposal.json, ops.json, proposal.csv and proposal.md.
// Usage: npx tsx scripts/trim-batch.mts proposals/<space>/batch-NN <ids.txt>
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rebuildOps, type PlannedRelation } from "../src/publish/dry-run.js";

const [dir, idsFile] = process.argv.slice(2);
if (!dir || !idsFile) throw new Error("usage: trim-batch.mts <batch dir> <ids.txt>");
if (existsSync(join(dir, "submission.json"))) throw new Error(`${dir} was already submitted`);
const keep = readFileSync(idsFile, "utf8").split(/\r?\n/).map((l) => l.split("#")[0]!.trim()).filter(Boolean);

interface ManifestClaim {
  claimId: string;
  text: string;
  link: string;
  politicalPosition: string | null;
  ideologicalLeaning: string | null;
  issuePositions: string[];
  relations: PlannedRelation[];
  explanation: string;
}
const manifest = JSON.parse(readFileSync(join(dir, "proposal.json"), "utf8")) as { space: string; spaceId: string; leaningsPropertyId: string; claims: ManifestClaim[] };
const missing = keep.filter((id) => !manifest.claims.some((c) => c.claimId === id));
if (missing.length) throw new Error(`Not in ${dir}: ${missing.join(", ")}`);
manifest.claims = keep.map((id) => manifest.claims.find((c) => c.claimId === id)!);
const ops = rebuildOps(manifest.leaningsPropertyId, manifest.claims);

const json = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (v instanceof Uint8Array ? Buffer.from(v).toString("hex") : typeof v === "bigint" ? v.toString() : v), 2) + "\n";
writeFileSync(join(dir, "proposal.json"), json(manifest));
writeFileSync(join(dir, "ops.json"), json({ space: manifest.space, spaceId: manifest.spaceId, trimmedAt: new Date().toISOString(), opCount: ops.length, ops }));
const escape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
writeFileSync(
  join(dir, "proposal.csv"),
  "﻿" +
    [
      ["Claim", "Political position", "Ideological leaning", "Issue positions", "Value IDs", "Geo link", "Claim ID"],
      ...manifest.claims.map((c) => [c.text, c.politicalPosition ?? "", c.ideologicalLeaning ?? "", c.issuePositions.join(", "), c.relations.map((r) => r.valueId).join(" "), c.link, c.claimId]),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\r\n") +
    "\r\n",
);
writeFileSync(
  join(dir, "proposal.md"),
  [
    `# Leanings proposal: ${manifest.space}, ${dir.split(/[\\/]/).pop()}`,
    "",
    `**Dry run, trimmed after review to ${manifest.claims.length} claims.** Nothing has been sent to Geo. ${ops.length} Leanings links.`,
    "",
    "| # | Claim | Political position | Ideological leaning | Issue positions | Geo |",
    "|---|---|---|---|---|---|",
    ...manifest.claims.map(
      (c, i) => `| ${i + 1} | ${c.text.replaceAll("|", "\\|")} | ${c.politicalPosition ?? ""} | ${c.ideologicalLeaning ?? ""} | ${c.issuePositions.join(", ")} | [open](${c.link}) |`,
    ),
    "",
    "## Why each label",
    "",
    ...manifest.claims.flatMap((c, i) => [`${i + 1}. **${c.text}**`, `   - ${c.explanation}`, `   - Values: ${c.relations.map((r) => `${r.valueName} \`${r.valueId}\``).join(", ")}`]),
    "",
  ].join("\n"),
);
console.log(`${dir}: ${manifest.claims.length} claims, ${ops.length} Leanings links`);
