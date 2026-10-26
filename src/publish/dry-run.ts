import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Ops } from "@geoprotocol/geo-sdk";
import { geoEntityUrl, IDS } from "../config.js";
import { FRAMEWORK_VERSION } from "../framework/rubric.js";
import type { Taxonomy } from "../geo/taxonomy.js";
import type { Batch, BatchItem } from "./batch.js";

export interface PlannedRelation {
  relationId: string;
  /** The relation's own entity; recorded so the exact ops can be rebuilt at submit time. */
  entityId: string;
  claimId: string;
  valueId: string;
  valueName: string;
}

const hex = (id: unknown): string => (id instanceof Uint8Array ? Buffer.from(id).toString("hex") : String(id));

/** One createRelation op per value: claim --Leanings--> value. Built with the Geo SDK, never sent. */
export function buildLeaningsOps(items: BatchItem[], taxonomy: Taxonomy): { relations: PlannedRelation[]; ops: unknown[] } {
  const names = new Map([...taxonomy.byName.values()].map((v) => [v.id, v.name]));
  const relations: PlannedRelation[] = [];
  const ops: unknown[] = [];
  for (const { claim, valueIds } of items) {
    for (const valueId of valueIds) {
      const valueName = names.get(valueId);
      if (!valueName) throw new Error(`Value ${valueId} is no longer in the taxonomy`);
      const created = Ops.relations.create({ fromEntity: claim.id, toEntity: valueId, type: IDS.leaningsProperty });
      const entityId = hex((created.ops[0] as { entity?: unknown } | undefined)?.entity);
      relations.push({ relationId: hex(created.id), entityId, claimId: claim.id, valueId, valueName });
      ops.push(...created.ops);
    }
  }
  return { relations, ops };
}

/** Rebuilds the same ops from a proposal.json, as the submit snippet does. */
export function rebuildOps(leaningsPropertyId: string, claims: { claimId: string; relations: PlannedRelation[] }[]): unknown[] {
  return claims.flatMap((c) =>
    c.relations.flatMap(
      (r) =>
        Ops.relations.create({ id: r.relationId, entityId: r.entityId, fromEntity: c.claimId, toEntity: r.valueId, type: leaningsPropertyId })
          .ops,
    ),
  );
}

/** Next free proposals/<space>/batch-NN folder; existing batches are never overwritten. */
export function nextBatchDir(spaceSlug: string, root = "proposals"): string {
  const base = join(root, spaceSlug);
  const used = existsSync(base)
    ? readdirSync(base)
        .map((d) => /^batch-(\d+)$/.exec(d)?.[1])
        .filter((n): n is string => n !== undefined)
        .map(Number)
    : [];
  return join(base, `batch-${String(Math.max(0, ...used) + 1).padStart(2, "0")}`);
}

/** Claim IDs already in a proposal batch, so no claim is proposed twice. */
export function idsInProposals(root = "proposals"): Set<string> {
  const ids = new Set<string>();
  if (!existsSync(root)) return ids;
  for (const space of readdirSync(root, { withFileTypes: true })) {
    if (!space.isDirectory()) continue;
    for (const batch of readdirSync(join(root, space.name))) {
      const manifest = join(root, space.name, batch, "proposal.json");
      if (!existsSync(manifest)) continue;
      for (const c of (JSON.parse(readFileSync(manifest, "utf8")) as { claims: { claimId: string }[] }).claims) ids.add(c.claimId);
    }
  }
  return ids;
}

const json = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (v instanceof Uint8Array ? Buffer.from(v).toString("hex") : typeof v === "bigint" ? v.toString() : v), 2) + "\n";

export function writeDryRun(batch: Batch, taxonomy: Taxonomy, dir: string): string[] {
  if (existsSync(dir)) throw new Error(`${dir} already exists`);
  mkdirSync(dir, { recursive: true });
  const { relations, ops } = buildLeaningsOps(batch.items, taxonomy);
  const generatedAt = new Date().toISOString();
  const model = batch.items[0]?.result.versions.scorer ?? "";
  const space = batch.space;

  const claims = batch.items.map(({ claim, result, removed }) => ({
    claimId: claim.id,
    text: claim.text,
    link: geoEntityUrl(space.id, claim.id),
    politicalPosition: result.leaning,
    politicalIdeology: result.ideologies.find((i) => i.kind === "tradition")?.name ?? null,
    issuePositions: result.ideologies.filter((i) => i.kind === "issue").map((i) => i.name),
    relations: relations.filter((r) => r.claimId === claim.id),
    evidence: [...result.criteria.map((c) => c.evidence), ...result.ideologies.map((i) => i.evidence)],
    explanation: result.explanation + (removed?.length ? ` Removed after review: ${removed.map((r) => `${r.name} (${r.reason})`).join("; ")}.` : ""),
    removedAfterReview: removed ?? [],
    rules: result.checks.map((c) => `${c.id} ${c.pass ? "pass" : "FAIL"}: ${c.detail}`),
  }));

  const files = {
    manifest: join(dir, "proposal.json"),
    ops: join(dir, "ops.json"),
    csv: join(dir, "proposal.csv"),
    markdown: join(dir, "proposal.md"),
  };

  writeFileSync(
    files.manifest,
    json({
      space: space.slug,
      spaceId: space.id,
      leaningsPropertyId: IDS.leaningsProperty,
      generatedAt,
      model,
      framework: FRAMEWORK_VERSION,
      taxonomyFingerprint: taxonomy.fingerprint,
      checks: [
        "claim chosen for this proposal after review",
        "claim is in the space",
        "claim has no Leanings yet",
        "every publish rule passed (P1–P6 for a Political position, I3/I4/I6 for a Political ideology or Issue position)",
        "at most one Political position and one Political ideology per claim",
      ],
      claims,
    }),
  );
  writeFileSync(files.ops, json({ space: space.slug, spaceId: space.id, generatedAt, opCount: ops.length, ops }));

  const escape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  writeFileSync(
    files.csv,
    "﻿" +
      [
        ["Claim", "Political position", "Political ideology", "Issue positions", "Value IDs", "Geo link", "Claim ID"],
        ...claims.map((c) => [
          c.text,
          c.politicalPosition ?? "",
          c.politicalIdeology ?? "",
          c.issuePositions.join(", "),
          c.relations.map((r) => r.valueId).join(" "),
          c.link,
          c.claimId,
        ]),
      ]
        .map((row) => row.map(escape).join(","))
        .join("\r\n") +
      "\r\n",
  );

  const leaningsText = (c: (typeof claims)[number]) => [c.politicalPosition, c.politicalIdeology, ...c.issuePositions].filter(Boolean).join(", ");
  const md = [
    `# Leanings proposal: ${space.name}, ${dir.split(/[\\/]/).pop()}`,
    "",
    `**Dry run.** Nothing has been sent to Geo. Submit it yourself after the review below.`,
    "",
    `- Space: ${space.name} (\`${space.id}\`)`,
    `- Claims: ${claims.length}; Leanings links to add: ${relations.length}`,
    `- Generated ${generatedAt} with ${model}, ${FRAMEWORK_VERSION}, taxonomy ${taxonomy.fingerprint}`,
    "",
    "Every claim below passed: it was chosen for this proposal after review, it is in the space, it has no Leanings yet, and the agent published each label because every publish rule passed. Each claim has at most one Political position and one Political ideology, and any number of Issue positions.",
    "",
    "## Before you submit",
    "",
    "- [ ] Read each claim and its labels. Remove any you are not sure about.",
    "- [ ] Check each Geo link still shows the claim without Leanings.",
    "",
    "## Claims",
    "",
    "| # | Claim | Political position | Political ideology | Issue positions | Geo |",
    "|---|---|---|---|---|---|",
    ...claims.map(
      (c, i) =>
        `| ${i + 1} | ${c.text.replaceAll("|", "\\|")} | ${c.politicalPosition ?? ""} | ${c.politicalIdeology ?? ""} | ${c.issuePositions.join(", ")} | [open](${c.link}) |`,
    ),
    "",
    "## Why each label",
    "",
    ...claims.flatMap((c, i) => [
      `${i + 1}. **${c.text}**: ${leaningsText(c)}`,
      `   - Evidence: ${c.evidence.map((e) => `“${e}”`).join("; ")}`,
      `   - ${c.explanation}`,
      `   - Values: ${c.relations.map((r) => `${r.valueName} \`${r.valueId}\``).join(", ")}`,
    ]),
    "",
    "## How to submit",
    "",
    `**In Geo:** open each claim link, add the values above to its Leanings property, and publish the edit as a proposal in ${space.name}.`,
    "",
    "**With the Geo SDK:** rebuild the operations from `proposal.json`. This gives exactly the ops in `ops.json`, which is a readable copy with IDs as hex.",
    "",
    "```ts",
    'import { readFileSync } from "node:fs";',
    'import { Ops } from "@geoprotocol/geo-sdk";',
    'const p = JSON.parse(readFileSync("proposal.json", "utf8"));',
    "const ops = p.claims.flatMap((c) => c.relations.flatMap((r) =>",
    "  Ops.relations.create({ id: r.relationId, entityId: r.entityId, fromEntity: c.claimId, toEntity: r.valueId, type: p.leaningsPropertyId }).ops));",
    "const proposal = await geo.daoSpaces.proposeEdit({",
    `  name: "Leanings for ${claims.length} ${space.name} claims",`,
    "  ops,",
    "  author: YOUR_PERSONAL_SPACE_ID,",
    "  callerSpaceId: YOUR_PERSONAL_SPACE_ID,",
    `  daoSpaceId: "${space.id}",`,
    '  votingMode: "FAST",',
    "});",
    "await walletClient.sendTransaction({ to: proposal.to, data: proposal.calldata });",
    "```",
    "",
    "## After it executes",
    "",
    "```sh",
    `npm run cli -- check-proposal --dir ${dir.replaceAll("\\", "/")}`,
    "```",
    "",
  ].join("\n");
  writeFileSync(files.markdown, md);
  return Object.values(files);
}
