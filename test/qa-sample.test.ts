import { describe, expect, it } from "vitest";
import { selectRows } from "../src/pipeline/qa-sample.js";
import { seededRng } from "../src/util/random.js";

const items = (labelled: number, blank: number) => [
  ...Array.from({ length: labelled }, (_, i) => ({ id: `L${i}`, result: { abstained: false } })),
  ...Array.from({ length: blank }, (_, i) => ({ id: `B${i}`, result: { abstained: true } })),
];
const count = (rows: { result: { abstained: boolean } }[]) => ({
  labelled: rows.filter((r) => !r.result.abstained).length,
  blank: rows.filter((r) => r.result.abstained).length,
});

describe("selectRows", () => {
  it("takes the target number of labelled rows and fills with blanks", () => {
    expect(count(selectRows(items(20, 40), 10, 6, seededRng(1)))).toEqual({ labelled: 6, blank: 4 });
  });

  it("uses more blanks when few claims were labelled", () => {
    expect(count(selectRows(items(2, 40), 10, 6, seededRng(1)))).toEqual({ labelled: 2, blank: 8 });
  });

  it("tops up with labelled rows when there are too few blanks", () => {
    expect(count(selectRows(items(20, 1), 10, 6, seededRng(1)))).toEqual({ labelled: 9, blank: 1 });
  });

  it("returns what exists when the pool is small, without duplicates", () => {
    const rows = selectRows(items(3, 2), 10, 6, seededRng(1));
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((r) => r.id)).size).toBe(5);
  });

  it("lists labelled rows first", () => {
    const rows = selectRows(items(6, 10), 10, 6, seededRng(3));
    expect(rows.slice(0, 6).every((r) => !r.result.abstained)).toBe(true);
  });
});
