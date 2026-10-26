import { describe, expect, it } from "vitest";
import type { ScoredClaim } from "../src/agent/v3/agent.js";
import { labelKey } from "../src/agent/verify.js";
import { IDS, SPACES } from "../src/config.js";
import type { Claim } from "../src/geo/claims.js";
import { buildTaxonomy } from "../src/geo/taxonomy.js";
import { publishGate, valueIdsFor, type BatchItem } from "../src/publish/batch.js";
import { buildLeaningsOps, rebuildOps } from "../src/publish/dry-run.js";

const space = SPACES[0];
const claim = (over: Partial<Claim> = {}): Claim => ({
  id: "c1",
  text: "Inheritance should be heavily taxed",
  spaceIds: [space.id],
  isFactual: null,
  context: {},
  leaningIds: [],
  ...over,
});
const ISSUES = new Set(["Pro-life", "Pro-border security"]);
const scored = (leaning: string | null, ideologies: string[] = []) =>
  ({
    claimId: "c1",
    leaning,
    ideologies: ideologies.map((name) => ({ name, kind: ISSUES.has(name) ? "issue" : "tradition" })),
    display: leaning ?? "No label (P4 Same level)",
  }) as unknown as ScoredClaim;

const taxonomy = buildTaxonomy(
  [{ id: "7a74f432548c417eb4abf9c45f3a7100", name: "Right", description: null }],
  [
    { id: "949d526009a5476b809b0ab9795907aa", name: "Nationalist", description: null },
    { id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", name: "MAGA", description: null },
  ],
  [
    { id: "053a4341639d43a5b0d534b40f7efe4f", name: "Pro-life", description: null },
    { id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", name: "Pro-border security", description: null },
  ],
  new Set(),
);

describe("publishGate", () => {
  it("passes a published label on a claim in the space with no Leanings", () => {
    expect(publishGate(space, claim(), scored("Right"))).toBeNull();
    expect(publishGate(space, claim(), scored(null, ["Nationalist"]))).toBeNull();
  });

  it("rejects claims with nothing published, existing Leanings or another space", () => {
    expect(publishGate(space, claim(), scored(null))).toMatch(/published nothing: No label/);
    expect(publishGate(space, claim({ leaningIds: ["x"] }), scored("Right"))).toMatch(/already has Leanings/);
    expect(publishGate(space, claim({ spaceIds: ["other"] }), scored("Right"))).toMatch(/not in this space/);
  });

  it("keys old verifications on the label, ignoring ideology order", () => {
    expect(labelKey({ political_leaning: "Right", ideologies: ["Nationalist", "Conservative"] })).toBe(
      labelKey({ political_leaning: "Right", ideologies: ["Conservative", "Nationalist"] }),
    );
  });
});

describe("valueIdsFor", () => {
  it("maps the published leaning and ideologies to Geo value IDs", () => {
    expect(valueIdsFor(scored("Right", ["Nationalist"]), taxonomy)).toEqual(["7a74f432548c417eb4abf9c45f3a7100", "949d526009a5476b809b0ab9795907aa"]);
  });
  it("refuses a name Geo does not have", () => {
    expect(() => valueIdsFor(scored("Left"), taxonomy)).toThrow(/not on Geo yet/);
  });
  it("allows one Political position, one Political ideology and several Issue positions, each of its own Geo type", () => {
    expect(valueIdsFor(scored("Right", ["Pro-life", "Pro-border security", "MAGA"]), taxonomy)).toHaveLength(4);
    expect(() => valueIdsFor(scored("Right", ["Nationalist", "MAGA"]), taxonomy)).toThrow(/more than one Political ideology/);
    const wrongType = { ...scored(null), ideologies: [{ name: "Nationalist", kind: "issue" }] } as unknown as ScoredClaim;
    expect(() => valueIdsFor(wrongType, taxonomy)).toThrow(/is a ideology on Geo, not a issue_position/);
  });
});

describe("buildLeaningsOps", () => {
  const item = (id: string, valueIds: string[]): BatchItem => ({ claim: claim({ id }), result: scored("Right", ["Nationalist"]), valueIds });

  it("creates one Leanings relation per value", () => {
    const { relations, ops } = buildLeaningsOps(
      [item("02d3e6ee405d4b8691dc84b33bebad21", ["7a74f432548c417eb4abf9c45f3a7100", "949d526009a5476b809b0ab9795907aa"])],
      taxonomy,
    );
    expect(relations.map((r) => r.valueName)).toEqual(["Right", "Nationalist"]);
    expect(ops).toHaveLength(2);
    const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
    for (const op of ops as { type: string; from: Uint8Array; relationType: Uint8Array }[]) {
      expect(op.type).toBe("createRelation");
      expect(hex(op.from)).toBe("02d3e6ee405d4b8691dc84b33bebad21");
      expect(hex(op.relationType)).toBe(IDS.leaningsProperty);
    }
    expect(relations.every((r) => /^[0-9a-f]{32}$/.test(r.relationId) && /^[0-9a-f]{32}$/.test(r.entityId))).toBe(true);
  });

  it("rebuilds byte-identical ops from the recorded IDs", () => {
    const id = "02d3e6ee405d4b8691dc84b33bebad21";
    const { relations, ops } = buildLeaningsOps([item(id, ["7a74f432548c417eb4abf9c45f3a7100", "949d526009a5476b809b0ab9795907aa"])], taxonomy);
    const rebuilt = rebuildOps(IDS.leaningsProperty, [{ claimId: id, relations }]);
    expect(rebuilt).toEqual(ops);
  });

  it("refuses values that left the taxonomy", () => {
    expect(() => buildLeaningsOps([item("c1", ["gone"])], taxonomy)).toThrow(/no longer in the taxonomy/);
  });
});
