import { z } from "zod";
import type { Taxonomy } from "../geo/taxonomy.js";

export const ABSTAIN_REASONS = ["factual_report", "apolitical", "consensus", "ambiguous"] as const;
export const CONFIDENCES = ["high", "medium", "low"] as const;

export const LabelSchema = z.object({
  political_leaning: z.string().nullable(),
  ideologies: z.array(z.string()).max(2),
  confidence: z.enum(CONFIDENCES),
  evidence: z.string(),
  rationale: z.string(),
  abstain_reason: z.enum(ABSTAIN_REASONS).nullable(),
});

export type Label = z.infer<typeof LabelSchema>;

/**
 * JSON schema for OpenAI structured outputs. The enums come from the live taxonomy,
 * so the model can only answer with values that exist in Geo.
 */
export function buildResponseSchema(taxonomy: Taxonomy): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["political_leaning", "ideologies", "confidence", "evidence", "rationale", "abstain_reason"],
    properties: {
      political_leaning: { type: ["string", "null"], enum: [...taxonomy.politicalLeanings.map((v) => v.name), null] },
      ideologies: { type: "array", maxItems: 2, items: { type: "string", enum: taxonomy.ideologies.map((v) => v.name) } },
      confidence: { type: "string", enum: [...CONFIDENCES] },
      evidence: { type: "string", description: "Words from the claim that carry the stance, or empty when abstaining" },
      rationale: { type: "string", description: "One or two sentences" },
      abstain_reason: { type: ["string", "null"], enum: [...ABSTAIN_REASONS, null] },
    },
  };
}

export interface ResolvedLabel {
  label: Label;
  /** Geo IDs to link through Leanings: the political leaning first, then ideologies. */
  valueIds: string[];
  abstained: boolean;
}

/**
 * Validates names against the taxonomy and makes the answer self-consistent:
 * no duplicate ideologies, an abstain reason exactly when nothing was labelled,
 * and no labels at low confidence.
 */
export function resolveLabel(raw: unknown, taxonomy: Taxonomy): ResolvedLabel {
  const label = LabelSchema.parse(raw);

  const leaning = label.political_leaning;
  if (leaning !== null && taxonomy.byName.get(leaning)?.kind !== "political_leaning") {
    throw new Error(`Unknown political leaning "${leaning}"`);
  }
  const ideologies = [...new Set(label.ideologies)];
  for (const name of ideologies) {
    if (taxonomy.byName.get(name)?.kind !== "ideology") throw new Error(`Unknown ideology "${name}"`);
  }

  if (label.confidence === "low" && (leaning !== null || ideologies.length)) {
    return {
      label: { ...label, political_leaning: null, ideologies: [], evidence: "", abstain_reason: "ambiguous" },
      valueIds: [],
      abstained: true,
    };
  }

  const names = leaning === null ? ideologies : [leaning, ...ideologies];
  const abstained = names.length === 0;
  return {
    label: {
      ...label,
      ideologies,
      abstain_reason: abstained ? (label.abstain_reason ?? "ambiguous") : null,
    },
    valueIds: names.map((n) => taxonomy.byName.get(n)!.id),
    abstained,
  };
}
