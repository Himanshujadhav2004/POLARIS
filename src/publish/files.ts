import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { rebuildOps, type PlannedRelation } from "./dry-run.js";

/** One claim in proposal.json, as written by the dry run and read back at submit time. */
export interface ProposalClaim {
  claimId: string;
  text: string;
  link: string;
  politicalPosition: string | null;
  ideologicalLeaning: string | null;
  issuePositions: string[];
  relations: PlannedRelation[];
  explanation: string;
}

export interface ProposalFile {
  space: string;
  spaceId: string;
  leaningsPropertyId: string;
  taxonomyFingerprint?: string;
  claims: ProposalClaim[];
  [extra: string]: unknown;
}

const json = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (v instanceof Uint8Array ? Buffer.from(v).toString("hex") : typeof v === "bigint" ? v.toString() : v), 2) + "\n";

/** Writes proposal.json, ops.json, proposal.csv and proposal.md for a batch built without the dry run. */
export function writeProposalFiles(dir: string, manifest: ProposalFile, note: string): number {
  const ops = rebuildOps(manifest.leaningsPropertyId, manifest.claims);
  writeFileSync(join(dir, "proposal.json"), json(manifest));
  writeFileSync(join(dir, "ops.json"), json({ space: manifest.space, spaceId: manifest.spaceId, writtenAt: new Date().toISOString(), opCount: ops.length, ops }));
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
      `**${note}** Nothing has been sent to Geo. ${manifest.claims.length} claims, ${ops.length} Leanings links.`,
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
  return ops.length;
}
