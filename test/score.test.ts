import { describe, expect, it } from "vitest";
import type { Label } from "../src/agent/schema.js";
import { scoreItem, type DevItem } from "../src/eval/score.js";

const item = (expect: DevItem["expect"], leanings: string[] = [], ideologies: string[] = []): DevItem => ({
  id: "x",
  space: "us-politics",
  text: "t",
  expect,
  leanings,
  ideologies,
  note: "",
});
const label = (political_leaning: string | null, ideologies: string[] = []): Label => ({
  political_leaning,
  ideologies,
  confidence: "high",
  evidence: "",
  rationale: "",
  abstain_reason: null,
});

describe("scoreItem", () => {
  it("requires a blank for expect=none", () => {
    expect(scoreItem(item("none"), label(null), true).pass).toBe(true);
    expect(scoreItem(item("none"), label("Left"), false).pass).toBe(false);
  });

  it("requires an acceptable leaning for expect=label", () => {
    const i = item("label", ["Left", "Center left"], ["Progressive"]);
    expect(scoreItem(i, label("Left", ["Progressive"]), false).pass).toBe(true);
    expect(scoreItem(i, label("Right"), false).pass).toBe(false);
    expect(scoreItem(i, label(null, ["Progressive"]), false).pass).toBe(false);
    expect(scoreItem(i, label(null), true).pass).toBe(false);
    expect(scoreItem(i, label("Left", ["Socialist"]), false).pass).toBe(false);
  });

  it("accepts a blank or an acceptable label for expect=either", () => {
    const i = item("either", ["Right"], ["Nationalist"]);
    expect(scoreItem(i, label(null), true).pass).toBe(true);
    expect(scoreItem(i, label("Right", ["Nationalist"]), false).pass).toBe(true);
    expect(scoreItem(i, label(null, ["Nationalist"]), false).pass).toBe(true);
    expect(scoreItem(i, label("Left"), false).pass).toBe(false);
  });

  it("requires a null leaning when no leaning is acceptable", () => {
    const i = item("either", [], ["Isolationist"]);
    expect(scoreItem(i, label(null, ["Isolationist"]), false).pass).toBe(true);
    expect(scoreItem(i, label("Right", ["Isolationist"]), false).pass).toBe(false);
  });
});
