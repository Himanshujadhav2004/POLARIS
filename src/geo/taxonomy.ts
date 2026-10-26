import { createHash } from "node:crypto";
import { EXCLUDED_VALUE_IDS, IDS } from "../config.js";
import type { GeoClient } from "./client.js";

/** Geo's three Leanings types: Political position, Political ideology and Issue position. */
export type TaxonomyKind = "political_leaning" | "ideology" | "issue_position";

export interface TaxonomyValue {
  id: string;
  name: string;
  description: string | null;
  kind: TaxonomyKind;
}

export interface Taxonomy {
  /** Political position values (Far left … Far right). */
  politicalLeanings: TaxonomyValue[];
  /** Political ideology values (traditions). */
  ideologies: TaxonomyValue[];
  /** Issue position values (one side of one issue). */
  issuePositions: TaxonomyValue[];
  /** Short hash of every value's kind, id and name; changes whenever editors change the value lists. */
  fingerprint: string;
  byName: ReadonlyMap<string, TaxonomyValue>;
  /** Geo's live descriptions of the three types, when loaded from Geo. */
  definitions?: { politicalLeaning: string | null; ideology: string | null; issuePosition: string | null };
}

export interface RawValue {
  id: string;
  name: string | null;
  description: string | null;
}

/** Left-to-right order used when listing political leanings; unknown names go last. */
const SPECTRUM_ORDER = ["Far left", "Left", "Center left", "Center", "Center right", "Right", "Far right"];

export function buildTaxonomy(
  rawLeanings: RawValue[],
  rawIdeologies: RawValue[],
  rawIssuePositions: RawValue[] = [],
  excluded: ReadonlySet<string> = EXCLUDED_VALUE_IDS,
): Taxonomy {
  const toValues = (raw: RawValue[], kind: TaxonomyKind): TaxonomyValue[] =>
    raw
      .filter((v) => !excluded.has(v.id) && v.name?.trim())
      .map((v) => ({ id: v.id, name: v.name!.trim(), description: v.description?.trim() || null, kind }));

  const spectrumIndex = (name: string) => {
    const i = SPECTRUM_ORDER.indexOf(name);
    return i === -1 ? SPECTRUM_ORDER.length : i;
  };
  const politicalLeanings = toValues(rawLeanings, "political_leaning").sort(
    (a, b) => spectrumIndex(a.name) - spectrumIndex(b.name) || a.name.localeCompare(b.name),
  );
  const ideologies = toValues(rawIdeologies, "ideology").sort((a, b) => a.name.localeCompare(b.name));
  const issuePositions = toValues(rawIssuePositions, "issue_position").sort((a, b) => a.name.localeCompare(b.name));

  const byName = new Map<string, TaxonomyValue>();
  for (const value of [...politicalLeanings, ...ideologies, ...issuePositions]) {
    const clash = byName.get(value.name);
    if (clash) {
      throw new Error(
        `Taxonomy has two values named "${value.name}" (${clash.id}, ${value.id}). ` +
          `Add the duplicate to EXCLUDED_VALUE_IDS in src/config.ts.`,
      );
    }
    byName.set(value.name, value);
  }

  const fingerprint = createHash("sha256")
    .update([...byName.values()].map((v) => `${v.kind}:${v.id}:${v.name}`).sort().join("\n"))
    .digest("hex")
    .slice(0, 12);

  return { politicalLeanings, ideologies, issuePositions, fingerprint, byName };
}

const TAXONOMY_QUERY = /* GraphQL */ `
  query Taxonomy($leaningType: UUID!, $ideologyType: UUID!, $issueType: UUID!) {
    leanings: entities(typeId: $leaningType, first: 200) { id name description }
    ideologies: entities(typeId: $ideologyType, first: 200) { id name description }
    issues: entities(typeId: $issueType, first: 200) { id name description }
    leaningTypeEntity: entity(id: $leaningType) { description }
    ideologyTypeEntity: entity(id: $ideologyType) { description }
    issueTypeEntity: entity(id: $issueType) { description }
  }
`;

/** Loads the current Political position, Political ideology and Issue position values from Geo. */
export async function fetchTaxonomy(client: GeoClient): Promise<Taxonomy> {
  type Described = { description: string | null } | null;
  const data = await client.query<{
    leanings: RawValue[];
    ideologies: RawValue[];
    issues: RawValue[];
    leaningTypeEntity: Described;
    ideologyTypeEntity: Described;
    issueTypeEntity: Described;
  }>(TAXONOMY_QUERY, {
    leaningType: IDS.politicalLeaningType,
    ideologyType: IDS.ideologyType,
    issueType: IDS.issuePositionType,
  });
  if (!data.leanings.length || !data.ideologies.length || !data.issues.length) {
    throw new Error("Geo returned an empty Political position, Political ideology or Issue position list; refusing to classify against it.");
  }
  return {
    ...buildTaxonomy(data.leanings, data.ideologies, data.issues),
    definitions: {
      politicalLeaning: data.leaningTypeEntity?.description?.trim() ?? null,
      ideology: data.ideologyTypeEntity?.description?.trim() ?? null,
      issuePosition: data.issueTypeEntity?.description?.trim() ?? null,
    },
  };
}
