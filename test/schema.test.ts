import { describe, expect, it } from "vitest";
import { buildResponseSchema, resolveLabel } from "../src/agent/schema.js";
import { buildTaxonomy } from "../src/geo/taxonomy.js";

const taxonomy = buildTaxonomy(
  [
    { id: "left", name: "Left", description: null },
    { id: "right", name: "Right", description: null },
  ],
  [
    { id: "cons", name: "Conservative", description: null },
    { id: "nat", name: "Nationalist", description: null },
  ],
  [],
  new Set(),
);

const base = { confidence: "high", evidence: "x", rationale: "y", abstain_reason: null } as const;

describe("buildResponseSchema", () => {
  it("only allows taxonomy values", () => {
    const schema = buildResponseSchema(taxonomy) as { properties: Record<string, { enum?: unknown[]; items?: { enum: unknown[] } }> };
    expect(schema.properties.political_leaning!.enum).toEqual(["Left", "Right", null]);
    expect(schema.properties.ideologies!.items!.enum).toEqual(["Conservative", "Nationalist"]);
  });
});

describe("resolveLabel", () => {
  it("maps names to IDs with the leaning first", () => {
    const r = resolveLabel({ ...base, political_leaning: "Right", ideologies: ["Nationalist", "Conservative"] }, taxonomy);
    expect(r.valueIds).toEqual(["right", "nat", "cons"]);
    expect(r.abstained).toBe(false);
    expect(r.label.abstain_reason).toBeNull();
  });

  it("removes duplicate ideologies", () => {
    const r = resolveLabel({ ...base, political_leaning: null, ideologies: ["Conservative", "Conservative"] }, taxonomy);
    expect(r.valueIds).toEqual(["cons"]);
  });

  it("fills in an abstain reason when nothing is labelled", () => {
    const r = resolveLabel({ ...base, political_leaning: null, ideologies: [] }, taxonomy);
    expect(r.abstained).toBe(true);
    expect(r.label.abstain_reason).toBe("ambiguous");
  });

  it("turns low-confidence labels into a blank", () => {
    const r = resolveLabel({ ...base, confidence: "low", political_leaning: "Left", ideologies: [] }, taxonomy);
    expect(r.abstained).toBe(true);
    expect(r.valueIds).toEqual([]);
    expect(r.label.political_leaning).toBeNull();
  });

  it("rejects values outside the taxonomy or of the wrong kind", () => {
    expect(() => resolveLabel({ ...base, political_leaning: "Centrist", ideologies: [] }, taxonomy)).toThrow(/Unknown political leaning/);
    expect(() => resolveLabel({ ...base, political_leaning: "Conservative", ideologies: [] }, taxonomy)).toThrow(/Unknown political leaning/);
    expect(() => resolveLabel({ ...base, political_leaning: null, ideologies: ["Left"] }, taxonomy)).toThrow(/Unknown ideology/);
  });
});
