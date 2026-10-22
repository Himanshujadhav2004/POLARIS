import { describe, expect, it } from "vitest";
import { IDS } from "../src/config.js";
import { toClaim, type RawClaim } from "../src/geo/claims.js";

const rel = (typeId: string, kind: string, id: string, name: string | null) => ({
  typeId,
  typeEntity: { name: kind },
  toEntity: { id, name },
});

const raw: RawClaim = {
  id: "claim1",
  name: "  Birthright citizenship should be ended ",
  spaceIds: ["space1"],
  valuesList: [
    { property: { name: "Name" }, boolean: null },
    { property: { name: "Is factual" }, boolean: false },
  ],
  relationsList: [
    rel("topics", "Topics", "t1", "Citizenship"),
    rel("topics", "Topics", "t2", "Immigration"),
    rel("topics", "Topics", "t3", "Immigration"),
    rel("tags", "Tags", "g1", "Debate"),
    rel("tags", "Tags", "g2", null),
    rel(IDS.typesProperty, "Types", "claimType", "Claim"),
    rel(IDS.leaningsProperty, "Leanings", "right", "Right"),
  ],
};

describe("toClaim", () => {
  it("groups context by relation type and removes duplicates and blanks", () => {
    const claim = toClaim(raw);
    expect(claim.text).toBe("Birthright citizenship should be ended");
    expect(claim.context).toEqual({ Topics: ["Citizenship", "Immigration"], Tags: ["Debate"] });
  });

  it("keeps Types and Leanings out of the context and records existing Leanings", () => {
    const claim = toClaim(raw);
    expect(claim.context).not.toHaveProperty("Types");
    expect(claim.context).not.toHaveProperty("Leanings");
    expect(claim.leaningIds).toEqual(["right"]);
  });

  it("reads the Is factual checkbox", () => {
    expect(toClaim(raw).isFactual).toBe(false);
    expect(toClaim({ ...raw, valuesList: [] }).isFactual).toBeNull();
  });

  it("caps each context group", () => {
    const many = Array.from({ length: 40 }, (_, i) => rel("topics", "Topics", `t${i}`, `Topic ${i}`));
    expect(toClaim({ ...raw, relationsList: many }).context.Topics).toHaveLength(15);
  });
});
