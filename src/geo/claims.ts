import { IDS } from "../config.js";
import { randomHexId, type Rng } from "../util/random.js";
import type { GeoClient } from "./client.js";

export interface Claim {
  id: string;
  text: string;
  spaceIds: string[];
  /** The claim's "Is factual" checkbox, when set. */
  isFactual: boolean | null;
  /** Related entity names grouped by relation type, e.g. { Topics: [...], Sources: [...] }. */
  context: Record<string, string[]>;
  /** IDs of values already linked through the Leanings property. */
  leaningIds: string[];
}

export interface RawClaim {
  id: string;
  name: string | null;
  spaceIds: string[] | null;
  valuesList: { property: { name: string | null } | null; boolean: boolean | null }[];
  relationsList: { typeId: string; typeEntity: { name: string | null } | null; toEntity: { id: string; name: string | null } | null }[];
}

/** Context names kept per relation type, so one claim cannot flood the prompt. */
const MAX_CONTEXT_PER_KIND = 15;

export function toClaim(raw: RawClaim): Claim {
  const context: Record<string, string[]> = {};
  const leaningIds: string[] = [];

  for (const rel of raw.relationsList) {
    if (rel.typeId === IDS.leaningsProperty) {
      if (rel.toEntity) leaningIds.push(rel.toEntity.id);
      continue;
    }
    if (rel.typeId === IDS.typesProperty) continue;
    const kind = rel.typeEntity?.name?.trim();
    const name = rel.toEntity?.name?.trim();
    if (!kind || !name) continue;
    const names = (context[kind] ??= []);
    if (names.length < MAX_CONTEXT_PER_KIND && !names.includes(name)) names.push(name);
  }

  const factual = raw.valuesList.find((v) => v.property?.name === "Is factual");
  return {
    id: raw.id,
    text: raw.name?.trim() ?? "",
    spaceIds: raw.spaceIds ?? [],
    isFactual: factual?.boolean ?? null,
    context,
    leaningIds,
  };
}

const CLAIMS_QUERY = /* GraphQL */ `
  query Claims($ids: [UUID!]!, $first: Int!) {
    entities(filter: { id: { in: $ids } }, first: $first) {
      id
      name
      spaceIds
      valuesList(first: 50) { property { name } boolean }
      relationsList(first: 200) { typeId typeEntity { name } toEntity { id name } }
    }
  }
`;

/** Fetches claims with their context. Returned in the order of `ids`; missing IDs are skipped. */
export async function fetchClaims(client: GeoClient, ids: string[], chunkSize = 25): Promise<Claim[]> {
  const found = new Map<string, Claim>();
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const data = await client.query<{ entities: RawClaim[] }>(CLAIMS_QUERY, { ids: chunk, first: chunk.length });
    for (const raw of data.entities) found.set(raw.id, toClaim(raw));
  }
  return ids.flatMap((id) => found.get(id) ?? []);
}

const PIVOT_QUERY = /* GraphQL */ `
  query Pivot($spaceId: UUID!, $typeId: UUID!, $after: UUID!, $first: Int!) {
    entities(spaceId: $spaceId, typeId: $typeId, orderBy: [ID_ASC], filter: { id: { greaterThan: $after } }, first: $first) {
      id
    }
  }
`;

/**
 * Picks claim IDs from a space at random. Each draw jumps to a random point in the ID range
 * and takes the next `perPivot` claims, which avoids the API's 1000-row offset cap.
 */
export async function sampleClaimIds(
  client: GeoClient,
  spaceId: string,
  count: number,
  rng: Rng,
  perPivot = 2,
): Promise<string[]> {
  const ids = new Set<string>();
  for (let attempt = 0; ids.size < count && attempt < count * 4; attempt++) {
    // A pivot beyond the largest ID returns nothing; "0…0" wraps around to the start.
    let pivot = randomHexId(rng);
    for (let pass = 0; pass < 2; pass++) {
      const data = await client.query<{ entities: { id: string }[] }>(PIVOT_QUERY, {
        spaceId,
        typeId: IDS.claimType,
        after: pivot,
        first: perPivot,
      });
      if (data.entities.length) {
        for (const e of data.entities) if (ids.size < count) ids.add(e.id);
        break;
      }
      pivot = "0".repeat(32);
    }
  }
  return [...ids];
}

const PAGE_QUERY = /* GraphQL */ `
  query ClaimPage($spaceId: UUID!, $typeId: UUID!, $first: Int!, $after: Cursor) {
    entitiesConnection(spaceId: $spaceId, typeId: $typeId, orderBy: [ID_ASC], first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { id }
    }
  }
`;

/** Walks every claim ID in a space with cursor paging. */
export async function* iterateClaimIds(client: GeoClient, spaceId: string, pageSize = 200): AsyncGenerator<string[]> {
  let after: string | null = null;
  for (;;) {
    const data: { entitiesConnection: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: { id: string }[] } } =
      await client.query(PAGE_QUERY, { spaceId, typeId: IDS.claimType, first: pageSize, after });
    const { pageInfo, nodes } = data.entitiesConnection;
    if (nodes.length) yield nodes.map((n) => n.id);
    if (!pageInfo.hasNextPage || !pageInfo.endCursor) return;
    after = pageInfo.endCursor;
  }
}

const COUNT_QUERY = /* GraphQL */ `
  query ClaimCount($spaceId: UUID!, $typeId: UUID!) {
    entitiesConnection(spaceId: $spaceId, typeId: $typeId) { totalCount }
  }
`;

export async function countClaims(client: GeoClient, spaceId: string): Promise<number> {
  const data = await client.query<{ entitiesConnection: { totalCount: number } }>(COUNT_QUERY, {
    spaceId,
    typeId: IDS.claimType,
  });
  return data.entitiesConnection.totalCount;
}
