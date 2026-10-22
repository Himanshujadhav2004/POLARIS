# Leanings proposal: US Politics, batch-02

**Dry run.** Nothing has been sent to Geo. Submit it yourself after the review below.

- Space: US Politics (`4582fbbee28a16589154f7e36f1ee3c5`)
- Claims: 1; Leanings links to add: 2
- Generated 2026-10-22T10:28:50.554Z with gpt-5.5-2026-04-23, prompt v2, verifier verify-v1, taxonomy 29b6190c8354

Every claim below passed: it is in the space, it has no Leanings yet, the agent was highly confident, and an independent verifier agreed with every part of the label.

## Before you submit

- [ ] Read each claim and its labels. Remove any you are not sure about.
- [ ] Check each Geo link still shows the claim without Leanings.

## Claims

| # | Claim | Leanings to add | Geo |
|---|---|---|---|
| 1 | Workers should be entitled to company board seats | Left, Social democrat | [open](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/fdaa25c151c6e67301f02e5f3a1e7100) |

## Why each label

1. **Workers should be entitled to company board seats**: Left, Social democrat
   - Evidence: "Workers should be entitled to company board seats"
   - Advocates mandatory worker representation in corporate governance, a pro-labor policy associated with the left. The specific idea of worker board seats fits social democratic models of co-determination.
   - Values: Left `3628835899e04b4cbd2bdfc1027c53d3`, Social democrat `196f3d425aee453eaf6625540dd1faec`

## How to submit

**In Geo:** open each claim link, add the values above to its Leanings property, and publish the edit as a proposal in US Politics.

**With the Geo SDK:** rebuild the operations from `proposal.json`. This gives exactly the ops in `ops.json`, which is a readable copy with IDs as hex.

```ts
import { readFileSync } from "node:fs";
import { Ops } from "@geoprotocol/geo-sdk";
const p = JSON.parse(readFileSync("proposal.json", "utf8"));
const ops = p.claims.flatMap((c) => c.relations.flatMap((r) =>
  Ops.relations.create({ id: r.relationId, entityId: r.entityId, fromEntity: c.claimId, toEntity: r.valueId, type: p.leaningsPropertyId }).ops));
const proposal = await geo.daoSpaces.proposeEdit({
  name: "Leanings for 1 US Politics claims",
  ops,
  author: YOUR_PERSONAL_SPACE_ID,
  callerSpaceId: YOUR_PERSONAL_SPACE_ID,
  daoSpaceId: "4582fbbee28a16589154f7e36f1ee3c5",
  votingMode: "FAST",
});
await walletClient.sendTransaction({ to: proposal.to, data: proposal.calldata });
```

## After it executes

```sh
npm run cli -- check-proposal --dir proposals/us-politics/batch-02
```
