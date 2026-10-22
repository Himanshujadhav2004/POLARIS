import { createHash } from "node:crypto";
import { EXCLUDED_VALUE_IDS, IDS } from "../config.js";
import type { GeoClient } from "./client.js";

export type TaxonomyKind = "political_leaning" | "ideology";

export interface TaxonomyValue {
  id: string;
  name: string;
  description: string | null;
  kind: TaxonomyKind;
}

export interface Taxonomy {
  politicalLeanings: TaxonomyValue[];
  ideologies: TaxonomyValue[];
  /** Short hash of every value's kind, id and name; changes whenever editors change the value lists. */
  fingerprint: string;
  byName: ReadonlyMap<string, TaxonomyValue>;
  /** Geo's live descriptions of the two types, when loaded from Geo. */
  definitions?: { politicalLeaning: string | null; ideology: string | null };
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

  const byName = new Map<string, TaxonomyValue>();
  for (const value of [...politicalLeanings, ...ideologies]) {
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

  return { politicalLeanings, ideologies, fingerprint, byName };
}

const TAXONOMY_QUERY = /* GraphQL */ `
  query Taxonomy($leaningType: UUID!, $ideologyType: UUID!) {
    leanings: entities(typeId: $leaningType, first: 200) { id name description }
    ideologies: entities(typeId: $ideologyType, first: 200) { id name description }
    leaningTypeEntity: entity(id: $leaningType) { description }
    ideologyTypeEntity: entity(id: $ideologyType) { description }
  }
`;

/** Loads the current Political leaning and Ideology values from Geo. */
export async function fetchTaxonomy(client: GeoClient): Promise<Taxonomy> {
  const data = await client.query<{
    leanings: RawValue[];
    ideologies: RawValue[];
    leaningTypeEntity: { description: string | null } | null;
    ideologyTypeEntity: { description: string | null } | null;
  }>(TAXONOMY_QUERY, {
    leaningType: IDS.politicalLeaningType,
    ideologyType: IDS.ideologyType,
  });
  if (!data.leanings.length || !data.ideologies.length) {
    throw new Error("Geo returned an empty Political leaning or Ideology list; refusing to classify against it.");
  }
  return {
    ...buildTaxonomy(data.leanings, data.ideologies),
    definitions: {
      politicalLeaning: data.leaningTypeEntity?.description?.trim() ?? null,
      ideology: data.ideologyTypeEntity?.description?.trim() ?? null,
    },
  };
}
