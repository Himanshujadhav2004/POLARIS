import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GeoClient } from "../geo/client.js";

interface ManifestClaim {
  claimId: string;
  text: string;
  relations: { valueId: string; valueName: string }[];
}

export interface ClaimStatus {
  claimId: string;
  text: string;
  status: "published" | "pending" | "partial" | "different";
  expected: string[];
  found: string[];
}

const QUERY = /* GraphQL */ `
  query Leanings($ids: [UUID!]!, $type: UUID!, $space: UUID!) {
    relations(filter: { fromEntityId: { in: $ids }, typeId: { is: $type }, spaceId: { is: $space } }) {
      fromEntityId
      toEntityId
    }
  }
`;

/** Compares a dry-run proposal with what Geo now shows, after the proposal has been voted through. */
export async function checkProposal(geo: GeoClient, dir: string): Promise<ClaimStatus[]> {
  const manifest = JSON.parse(readFileSync(join(dir, "proposal.json"), "utf8")) as {
    spaceId: string;
    leaningsPropertyId: string;
    claims: ManifestClaim[];
  };
  const data = await geo.query<{ relations: { fromEntityId: string; toEntityId: string }[] }>(QUERY, {
    ids: manifest.claims.map((c) => c.claimId),
    type: manifest.leaningsPropertyId,
    space: manifest.spaceId,
  });

  return manifest.claims.map((c) => {
    const expected = c.relations.map((r) => r.valueId).sort();
    const found = data.relations.filter((r) => r.fromEntityId === c.claimId).map((r) => r.toEntityId).sort();
    const hits = expected.filter((id) => found.includes(id)).length;
    const status =
      found.length === 0 ? "pending" : hits === expected.length && found.length === expected.length ? "published" : hits > 0 ? "partial" : "different";
    return { claimId: c.claimId, text: c.text, status, expected, found };
  });
}
