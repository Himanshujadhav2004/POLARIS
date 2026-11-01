// Proposes attaching the Leanings property to the Claim type's schema in a space, so Geo's UI shows a
// Leanings field on a claim page. The relations themselves are already in the graph; this is what makes
// them render. One relation: Claim --Properties--> Leanings.
// Usage: npx tsx scripts/propose-claim-schema.mts [space=us-politics] [--yes]
import { createGeoClient, createGeoWalletClient, GeoTestnetConfig, Ops } from "@geoprotocol/geo-sdk";
import { IDS, spaceBySlug, SUBMISSIONS_PAUSED } from "../src/config.js";
import { GeoClient } from "../src/geo/client.js";
import { loadAccount, personalSpaceOf } from "../src/publish/submit.js";

/** The relation type that lists a property on a type ("Properties" in the Geo app). */
const PROPERTIES = "01412f8381894ab1836565c7fd358cc1";

const slug = process.argv.find((a) => !a.startsWith("--") && a !== process.argv[0] && a !== process.argv[1]) ?? "us-politics";
const send = process.argv.includes("--yes");
const space = spaceBySlug(slug);
const geo = new GeoClient();

// Already there? Then nothing to propose.
const existing = await geo.query<{ entity: { relationsList: { typeId: string; toEntityId: string; spaceId: string }[] } | null }>(
  `query C($claim: UUID!) { entity(id: $claim) { relationsList(first: 200) { typeId toEntityId spaceId } } }`,
  { claim: IDS.claimType },
);
const already = (existing.entity?.relationsList ?? []).some((r) => r.typeId === PROPERTIES && r.toEntityId === IDS.leaningsProperty && r.spaceId === space.id);
if (already) {
  console.log(`Leanings is already on the Claim type's schema in ${space.name}. Nothing to propose.`);
  process.exit(0);
}

const created = Ops.relations.create({ fromEntity: IDS.claimType, toEntity: IDS.leaningsProperty, type: PROPERTIES });
const name = `Add Leanings to the Claim schema`;
console.log(`Proposal:   ${name}`);
console.log(`Space:      ${space.name} (${space.id})`);
console.log(`Operation:  1 createRelation`);
console.log(`            Claim (${IDS.claimType})`);
console.log(`              --Properties (${PROPERTIES})-->`);
console.log(`            Leanings (${IDS.leaningsProperty})`);
console.log(`\nWhat it changes: the Claim type lists Leanings as one of its properties, so a claim's page`);
console.log(`shows its Leanings. It adds no label and changes no claim's data.`);

if (!send) {
  console.log(`\nNothing was sent. Re-run with --yes to submit it.`);
  process.exit(0);
}
if (SUBMISSIONS_PAUSED) throw new Error("Submissions to Geo are paused (SUBMISSIONS_PAUSED in src/config.ts).");

const account = loadAccount();
const personalSpaceId = await personalSpaceOf(account.address);
if (!personalSpaceId) throw new Error(`wallet ${account.address} has no Geo personal space`);
const client = createGeoClient({ network: GeoTestnetConfig });
type ProposeParams = Parameters<typeof client.daoSpaces.proposeEdit>[0];
const proposal = await client.daoSpaces.proposeEdit({
  name,
  ops: created.ops as ProposeParams["ops"],
  author: personalSpaceId,
  callerSpaceId: personalSpaceId,
  daoSpaceId: space.id,
  votingMode: "FAST",
});
const wallet = await createGeoWalletClient({ signer: account, network: GeoTestnetConfig });
type SendArgs = Parameters<typeof wallet.sendTransaction>[0];
const txHash = await wallet.sendTransaction({ to: proposal.to, data: proposal.calldata } as unknown as SendArgs);
console.log(`\nSubmitted.\n  proposal ${proposal.proposalId}\n  tx       ${txHash}`);
