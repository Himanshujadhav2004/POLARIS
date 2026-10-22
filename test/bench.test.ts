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
const result = (outcome: "leaning" | "uncertain" | "no_position", leaning: string | null, qualifier: "Clear" | "Potential" | null, ideologies: [string, "Clear" | "Potential"][] = []) =>
  ({ outcome, leaning, qualifier, ideologies: ideologies.map(([name, q]) => ({ name, qualifier: q })) }) as never;

describe("judge", () => {
  it("accepts an acceptable leaning and ideology", () => {
    expect(judge(item({}), result("leaning", "Left", "Clear", [["Social democrat", "Clear"]])).verdict).toBe("Correct");
  });

  it("counts a missing leaning as a safe miss, not an error", () => {
    expect(judge(item({}), result("uncertain", null, null)).verdict).toBe("Safe miss");
  });

  it("flags a wrong leaning, and a confident one as a confident error", () => {
    const j = judge(item({}), result("leaning", "Right", "Clear"));
    expect(j).toMatchObject({ verdict: "Wrong label", confidentError: true });
    expect(judge(item({}), result("leaning", "Right", "Potential")).confidentError).toBe(false);
  });

  it("treats any label on a no-position or uncertain item as wrong", () => {
    expect(judge(item({ expect: "no_position", leanings: [], ideologies: [] }), result("leaning", "Left", "Potential")).verdict).toBe("Wrong label");
    expect(judge(item({ expect: "no_position", leanings: [], ideologies: [] }), result("uncertain", null, null, [["Populist", "Potential"]])).verdict).toBe("Wrong ideology");
    expect(judge(item({ expect: "uncertain", leanings: [] }), result("leaning", "Center", "Potential")).verdict).toBe("Wrong label");
  });

  it("allows a blank or an acceptable leaning for either-items, and nothing else", () => {
    const either = item({ expect: "either", leanings: ["Center right"] });
    expect(judge(either, result("uncertain", null, null)).verdict).toBe("Correct");
    expect(judge(either, result("leaning", "Center right", "Potential")).verdict).toBe("Correct");
    expect(judge(either, result("leaning", "Center left", "Potential")).verdict).toBe("Wrong label");
  });

  it("flags an unacceptable ideology", () => {
    const j = judge(item({}), result("leaning", "Left", "Clear", [["Marxist", "Clear"]]));
    expect(j).toMatchObject({ verdict: "Wrong ideology", confidentError: true });
  });
});

describe("test-set-v1", () => {
  it("is valid: unique IDs, known ideologies and leanings", () => {
    const set = loadTestSet("evals/test-set-v1.json");
    expect(set.items.length).toBeGreaterThanOrEqual(100);
  });
});
