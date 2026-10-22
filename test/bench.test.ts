import { describe, expect, it } from "vitest";
import { judge, loadTestSet, type TestItem } from "../src/eval/bench.js";

const item = (over: Partial<TestItem>): TestItem => ({
  id: "x",
  space: "us-politics",
  category: "c",
  text: "t",
  expect: "leaning",
  leanings: ["Center left", "Left"],
  ideologies: ["Social democrat"],
  note: "",
  ...over,
});
const result = (outcome: "leaning" | "no_label" | "no_position", leaning: string | null, ideologies: string[] = []) =>
  ({ outcome, leaning, ideologies: ideologies.map((name) => ({ name })) }) as never;

describe("judge", () => {
  it("accepts an acceptable published leaning and ideology", () => {
    expect(judge(item({}), result("leaning", "Left", ["Social democrat"])).verdict).toBe("Correct label");
  });

  it("counts a missing leaning as a missed label, not an error", () => {
    expect(judge(item({}), result("no_label", null)).verdict).toBe("Missed label");
  });

  it("flags a wrong published leaning", () => {
    expect(judge(item({}), result("leaning", "Right"))).toMatchObject({ verdict: "Wrong label" });
  });

  it("treats any published label on a no-position or uncertain item as wrong", () => {
    expect(judge(item({ expect: "no_position", leanings: [], ideologies: [] }), result("leaning", "Left")).verdict).toBe("Wrong label");
    expect(judge(item({ expect: "no_position", leanings: [], ideologies: [] }), result("no_label", null, ["Populist"])).verdict).toBe("Wrong ideology");
    expect(judge(item({ expect: "uncertain", leanings: [] }), result("leaning", "Center")).verdict).toBe("Wrong label");
  });

  it("allows a blank or an acceptable leaning for either-items, and nothing else", () => {
    const either = item({ expect: "either", leanings: ["Center right"] });
    expect(judge(either, result("no_label", null)).verdict).toBe("Correct blank");
    expect(judge(either, result("leaning", "Center right")).verdict).toBe("Correct label");
    expect(judge(either, result("leaning", "Center left")).verdict).toBe("Wrong label");
  });

  it("counts a correct ideology on a claim without a leaning as a correct label", () => {
    expect(judge(item({ expect: "uncertain", leanings: [], ideologies: ["Populist"] }), result("no_label", null, ["Populist"])).verdict).toBe("Correct label");
  });

  it("flags an unacceptable ideology", () => {
    expect(judge(item({}), result("leaning", "Left", ["Marxist"]))).toMatchObject({ verdict: "Wrong ideology" });
  });
});

describe("test-set-v1", () => {
  it("is valid: unique IDs, known ideologies and leanings", () => {
    const set = loadTestSet("evals/test-set-v1.json");
    expect(set.items.length).toBeGreaterThanOrEqual(100);
  });
});
