import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createGeoClient, createGeoWalletClient, GeoTestnetConfig } from "@geoprotocol/geo-sdk";
import { SpaceRegistryAbi } from "@geoprotocol/geo-sdk/abis";
import { requireGeoContract } from "@geoprotocol/geo-sdk/networks";
import { createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { requireEnv } from "../config.js";
import { fetchClaims } from "../geo/claims.js";
import type { GeoClient } from "../geo/client.js";
import { fetchTaxonomy } from "../geo/taxonomy.js";
import { rebuildOps, type PlannedRelation } from "./dry-run.js";

interface ManifestClaim {
  claimId: string;
  text: string;
  relations: PlannedRelation[];
}

export interface ProposalManifest {
  space: string;
  spaceId: string;
  leaningsPropertyId: string;
  taxonomyFingerprint: string;
  claims: ManifestClaim[];
}

export interface SubmitPlan {
  dir: string;
  manifest: ProposalManifest;
  name: string;
  ops: unknown[];
  account: PrivateKeyAccount;
  personalSpaceId: string | null;
  role: "editor" | "member" | "none";
  /** Anything here blocks submission. */
  problems: string[];
}

export interface Submission {
  submittedAt: string;
  name: string;
  proposalId: string;
  editId: string;
  cid: string;
  versionId: number;
  txHash: string;
  wallet: string;
  authorSpaceId: string;
  daoSpaceId: string;
  opCount: number;
}

const SUBMISSION_FILE = "submission.json";
const EMPTY_SPACE_ID = `0x${"0".repeat(32)}`;

/** Claims of this batch that already went out in another submitted batch of the same space. */
export function alreadySubmitted(dir: string, claimIds: string[]): { claimId: string; batch: string }[] {
  const spaceDir = dirname(dir);
  const self = dir.replaceAll("\\", "/").split("/").pop();
  const hits: { claimId: string; batch: string }[] = [];
  if (!existsSync(spaceDir)) return hits;
  for (const batch of readdirSync(spaceDir)) {
    if (batch === self || !existsSync(join(spaceDir, batch, SUBMISSION_FILE))) continue;
    const other = JSON.parse(readFileSync(join(spaceDir, batch, "proposal.json"), "utf8")) as ProposalManifest;
    for (const c of other.claims) if (claimIds.includes(c.claimId)) hits.push({ claimId: c.claimId, batch });
  }
  return hits;
}

export function loadAccount(): PrivateKeyAccount {
  const raw = requireEnv("GEO_PRIVATE_KEY");
  return privateKeyToAccount((raw.startsWith("0x") ? raw : `0x${raw}`) as Hex);
}

/** The wallet's personal space ID from Geo's space registry, or null if it has none. */
export async function personalSpaceOf(address: Hex): Promise<string | null> {
  const client = createPublicClient({ transport: http(GeoTestnetConfig.chain!.rpcUrl) });
  const id = (await client.readContract({
    address: requireGeoContract(GeoTestnetConfig, "SPACE_REGISTRY_ADDRESS"),
    abi: SpaceRegistryAbi,
    functionName: "addressToSpaceId",
    args: [address],
  })) as string;
  return id.toLowerCase() === EMPTY_SPACE_ID ? null : id.slice(2).toLowerCase();
}

const ROLE_QUERY = /* GraphQL */ `
  query Role($space: UUID!) {
    space(id: $space) { editorsList { memberSpaceId } membersList { memberSpaceId } }
  }
`;

/** Read-only: everything needed to submit, and every reason not to. Sends nothing. */
export async function planSubmission(geo: GeoClient, dir: string): Promise<SubmitPlan> {
  const manifest = JSON.parse(readFileSync(join(dir, "proposal.json"), "utf8")) as ProposalManifest;
  const problems: string[] = [];
  if (existsSync(join(dir, SUBMISSION_FILE))) problems.push(`this batch was already submitted (see ${join(dir, SUBMISSION_FILE)})`);
  for (const hit of alreadySubmitted(dir, manifest.claims.map((c) => c.claimId))) {
    problems.push(`claim ${hit.claimId} was already submitted in ${hit.batch}`);
  }

  const taxonomy = await fetchTaxonomy(geo);
  if (taxonomy.fingerprint !== manifest.taxonomyFingerprint) {
    problems.push(`the Political leaning / Ideology values changed since this batch was built (${manifest.taxonomyFingerprint} → ${taxonomy.fingerprint}); rebuild it`);
  }

  const claims = new Map((await fetchClaims(geo, manifest.claims.map((c) => c.claimId))).map((c) => [c.id, c]));
  for (const c of manifest.claims) {
    const live = claims.get(c.claimId);
    if (!live) problems.push(`claim ${c.claimId} no longer exists on Geo`);
    else if (!live.spaceIds.includes(manifest.spaceId)) problems.push(`claim ${c.claimId} is no longer in the space`);
    else if (live.leaningIds.length) problems.push(`claim ${c.claimId} already has Leanings on Geo`);
  }

  const account = loadAccount();
  const personalSpaceId = await personalSpaceOf(account.address);
  let role: SubmitPlan["role"] = "none";
  if (!personalSpaceId) {
    problems.push(`wallet ${account.address} has no Geo personal space`);
  } else {
    const { space } = await geo.query<{ space: { editorsList: { memberSpaceId: string }[]; membersList: { memberSpaceId: string }[] } | null }>(
      ROLE_QUERY,
      { space: manifest.spaceId },
    );
    const has = (list: { memberSpaceId: string }[] | undefined) => !!list?.some((m) => m.memberSpaceId.toLowerCase() === personalSpaceId);
    role = has(space?.editorsList) ? "editor" : has(space?.membersList) ? "member" : "none";
    if (role === "none") problems.push(`personal space ${personalSpaceId} is neither an editor nor a member of the space`);
  }

  const name =
    manifest.claims.length === 1
      ? `Add Leanings: ${manifest.claims[0]!.text}`
      : `Add Leanings to ${manifest.claims.length} claims`;
  return { dir, manifest, name, ops: rebuildOps(manifest.leaningsPropertyId, manifest.claims), account, personalSpaceId, role, problems };
}

/** Uploads the edit and sends the proposal transaction. Call only after planSubmission found no problems. */
export async function submit(plan: SubmitPlan): Promise<Submission> {
  if (plan.problems.length || !plan.personalSpaceId) throw new Error("Refusing to submit: the plan has problems.");
  const geo = createGeoClient({ network: GeoTestnetConfig });
  type ProposeParams = Parameters<typeof geo.daoSpaces.proposeEdit>[0];
  const proposal = await geo.daoSpaces.proposeEdit({
    name: plan.name,
    ops: plan.ops as ProposeParams["ops"],
    author: plan.personalSpaceId,
    callerSpaceId: plan.personalSpaceId,
    daoSpaceId: plan.manifest.spaceId,
    votingMode: "FAST",
  });
  const wallet = await createGeoWalletClient({ signer: plan.account, network: GeoTestnetConfig });
  // The call the SDK README documents. TypeScript resolves the Kernel client's union type to the
  // blob-transaction variant, so the documented shape needs a cast; runtime behaviour is unchanged.
  type SendArgs = Parameters<typeof wallet.sendTransaction>[0];
  const txHash = await wallet.sendTransaction({ to: proposal.to, data: proposal.calldata } as unknown as SendArgs);

  const submission: Submission = {
    submittedAt: new Date().toISOString(),
    name: plan.name,
    proposalId: proposal.proposalId,
    editId: String(proposal.editId),
    cid: proposal.cid,
    versionId: proposal.versionId,
    txHash,
    wallet: plan.account.address,
    authorSpaceId: plan.personalSpaceId,
    daoSpaceId: plan.manifest.spaceId,
    opCount: plan.ops.length,
  };
  writeFileSync(join(plan.dir, SUBMISSION_FILE), JSON.stringify(submission, null, 2) + "\n");
  return submission;
}
