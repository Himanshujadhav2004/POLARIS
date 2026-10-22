import { describe, expect, it } from "vitest";
import type { Classification } from "../src/agent/classify.js";
import type { Verification } from "../src/agent/verify.js";
import { labelKey } from "../src/agent/verify.js";
import { IDS, SPACES } from "../src/config.js";
import type { Claim } from "../src/geo/claims.js";
import { buildTaxonomy } from "../src/geo/taxonomy.js";
import { pickBalanced, preVerifyGate, side, verifyGate } from "../src/publish/batch.js";
import { buildLeaningsOps, rebuildOps } from "../src/publish/dry-run.js";
import { seededRng } from "../src/util/random.js";

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
const classification = (over: Partial<Classification["label"]> = {}, abstained = false): Classification => ({
  claimId: "c1",
  label: { political_leaning: "Left", ideologies: ["Progressive"], confidence: "high", evidence: "", rationale: "", abstain_reason: null, ...over },
  valueIds: ["left", "prog"],
  abstained,
  model: "gpt-5.5",
  resolvedModel: "gpt-5.5",
  promptVersion: "v2",
  taxonomyFingerprint: "x",
  usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0 },
});

describe("publishing gates", () => {
  it("passes a high-confidence label on a claim in the space with no Leanings", () => {
    expect(preVerifyGate(space, claim(), classification())).toBeNull();
  });

  it("rejects medium confidence, blanks, existing Leanings and other spaces", () => {
    expect(preVerifyGate(space, claim(), classification({ confidence: "medium" }))).toMatch(/medium/);
    expect(preVerifyGate(space, claim(), classification({}, true))).toMatch(/blank/);
    expect(preVerifyGate(space, claim({ leaningIds: ["x"] }), classification())).toMatch(/already has Leanings/);
    expect(preVerifyGate(space, claim({ spaceIds: ["other"] }), classification())).toMatch(/not in this space/);
  });

  it("requires the verifier to agree", () => {
    const v = (verdict: "agree" | "disagree"): Verification => ({
      claimId: "c1",
      labelKey: "k",
      verdict,
      problems: verdict === "agree" ? "" : "placement debatable",
      model: "gpt-5.5",
      resolvedModel: "gpt-5.5",
      verifierVersion: "verify-v1",
      usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0 },
    });
    expect(verifyGate(v("agree"))).toBeNull();
    expect(verifyGate(v("disagree"))).toMatch(/placement debatable/);
  });

  it("keys verifications on the label, ignoring ideology order", () => {
    expect(labelKey({ political_leaning: "Right", ideologies: ["Nationalist", "Conservative"] })).toBe(
      labelKey({ political_leaning: "Right", ideologies: ["Conservative", "Nationalist"] }),
    );
  });
});

describe("pickBalanced", () => {
  it("alternates sides", () => {
    const items = ["Left", "Left", "Left", "Left", "Right", "Right", null].map((leaning, i) => ({ i, leaning }));
    const picked = pickBalanced(items, (x) => side(x.leaning), 6, seededRng(1));
    const counts = { left: 0, right: 0, other: 0 };
    for (const p of picked) counts[side(p.leaning)]++;
    expect(counts).toEqual({ left: 3, right: 2, other: 1 });
  });

  it("returns everything when there are fewer items than requested", () => {
    expect(pickBalanced([1, 2], () => "left", 10, seededRng(1))).toHaveLength(2);
  });
});

describe("buildLeaningsOps", () => {
  const taxonomy = buildTaxonomy(
    [{ id: "7a74f432548c417eb4abf9c45f3a7100", name: "Right", description: null }],
    [{ id: "949d526009a5476b809b0ab9795907aa", name: "Nationalist", description: null }],
    new Set(),
  );

  it("creates one Leanings relation per value", () => {
    const c = classification({ political_leaning: "Right", ideologies: ["Nationalist"] });
    c.valueIds = ["7a74f432548c417eb4abf9c45f3a7100", "949d526009a5476b809b0ab9795907aa"];
    const { relations, ops } = buildLeaningsOps(
      [{ claim: claim({ id: "02d3e6ee405d4b8691dc84b33bebad21" }), classification: c, verification: {} as Verification }],
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
    const c = classification({ political_leaning: "Right", ideologies: ["Nationalist"] });
    c.valueIds = ["7a74f432548c417eb4abf9c45f3a7100", "949d526009a5476b809b0ab9795907aa"];
    const id = "02d3e6ee405d4b8691dc84b33bebad21";
    const { relations, ops } = buildLeaningsOps([{ claim: claim({ id }), classification: c, verification: {} as Verification }], taxonomy);
    const rebuilt = rebuildOps(IDS.leaningsProperty, [{ claimId: id, relations }]);
    expect(rebuilt).toEqual(ops);
  });

  it("refuses values that left the taxonomy", () => {
    const c = classification();
    c.valueIds = ["gone"];
    expect(() => buildLeaningsOps([{ claim: claim(), classification: c, verification: {} as Verification }], taxonomy)).toThrow(/no longer in the taxonomy/);
  });
});
