import { describe, expect, it } from "vitest";
import { randomHexId, seededRng, shuffle } from "../src/util/random.js";

describe("random helpers", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("produces Geo-shaped IDs", () => {
    expect(randomHexId(seededRng(1))).toMatch(/^[0-9a-f]{32}$/);
  });

  it("shuffles without losing items", () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(shuffle(items, seededRng(7)).sort()).toEqual(items);
  });
});
