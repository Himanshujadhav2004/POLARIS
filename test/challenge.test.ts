import { describe, expect, it } from "vitest";
import { challengeClaim, judgeChallenge, loadChallenge, summarizeChallenge, type ChallengeItem } from "../src/eval/challenge.js";

const item = (over: Partial<ChallengeItem> = {}): ChallengeItem => ({
  id: "c00",
  text: "Abortion should not be legal",
  space: "us-politics",
  expectLeaning: "Right",
  acceptLeanings: [],
  expectIdeologies: ["Pro-life"],
  acceptIdeologies: ["Christian conservative"],
  note: "",
  ...over,
});

describe("challenge set", () => {
  it("loads, and every expected or acceptable name is a known leaning in a known space", () => {
    const set = loadChallenge("evals/challenge-set-v1.json");
    expect(set.items.length).toBeGreaterThanOrEqual(60);
    expect(new Set(set.items.map((i) => i.id)).size).toBe(set.items.length);
  });

  it("gives a written claim a stable ID and the Geo space it is written for", () => {
    const a = challengeClaim(item());
    expect(a.id).toBe(challengeClaim(item()).id);
    expect(a.id).not.toBe(challengeClaim(item({ space: "health" })).id);
    expect(a.spaceIds).toEqual(["4582fbbee28a16589154f7e36f1ee3c5"]);
  });
});

describe("judgeChallenge", () => {
  it("counts a reversed or unexpected label as wrong, and a debatable one only as debatable", () => {
    const j = judgeChallenge(item(), "Left", ["Pro-choice", "Christian conservative"]);
    expect(j.wrongLeaning).toBe("Left");
    expect(j.missedLeaning).toBe(true);
    expect(j.wrongIdeologies).toEqual(["Pro-choice"]);
    expect(j.missedIdeologies).toEqual(["Pro-life"]);
    expect(j.debatable).toEqual(["Christian conservative"]);
  });

  it("treats a blank as a miss, never as wrong", () => {
    expect(judgeChallenge(item(), null, [])).toMatchObject({ wrongLeaning: null, missedLeaning: true, wrongIdeologies: [] });
  });

  it("counts any leaning on a claim that should have none as wrong, unless it is acceptable", () => {
    const blank = item({ expectLeaning: null, acceptLeanings: ["Center right"], expectIdeologies: [], acceptIdeologies: [] });
    expect(judgeChallenge(blank, "Right", []).wrongLeaning).toBe("Right");
    expect(judgeChallenge(blank, "Center right", []).wrongLeaning).toBeNull();
    expect(judgeChallenge(blank, null, []).missedLeaning).toBe(false);
  });

  it("summarizes wrong labels, misses and fully right claims", () => {
    const ok = item();
    const rows = [
      { item: ok, result: null, error: null, judged: judgeChallenge(ok, "Right", ["Pro-life"]) },
      { item: ok, result: null, error: null, judged: judgeChallenge(ok, "Left", []) },
      { item: ok, result: null, error: "boom", judged: null },
    ];
    expect(summarizeChallenge("t", rows)).toMatchObject({ claims: 3, errors: 1, fullyRight: 1, claimsWithWrongLabel: 1, wrongLeanings: 1, missedLeanings: 1, missedIdeologies: 1, expected: 4, found: 2 });
  });
});
