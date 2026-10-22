import type { Label } from "../agent/schema.js";

export interface DevItem {
  id: string;
  space: string;
  text: string;
  /** "label": must be labelled; "none": must be blank; "either": blank is fine, labels must be acceptable. */
  expect: "label" | "none" | "either";
  /** Acceptable political leanings. Empty on a label/either item means the leaning must be null. */
  leanings: string[];
  ideologies: string[];
  note: string;
}

export interface ItemScore {
  pass: boolean;
  reason: string;
}

export function scoreItem(item: DevItem, label: Label, abstained: boolean): ItemScore {
  if (item.expect === "none") {
    return abstained ? { pass: true, reason: "blank as expected" } : { pass: false, reason: "labelled a claim that should be blank" };
  }
  if (abstained) {
    return item.expect === "either"
      ? { pass: true, reason: "blank (acceptable)" }
      : { pass: false, reason: "left blank but should be labelled" };
  }

  const leaning = label.political_leaning;
  const leaningOk =
    leaning === null
      ? item.expect === "either" || item.leanings.length === 0
      : item.leanings.includes(leaning);
  if (!leaningOk) {
    return { pass: false, reason: leaning === null ? "missing political leaning" : `leaning "${leaning}" not acceptable` };
  }
  const wrong = label.ideologies.filter((i) => !item.ideologies.includes(i));
  if (wrong.length) return { pass: false, reason: `ideology ${wrong.map((w) => `"${w}"`).join(", ")} not acceptable` };
  return { pass: true, reason: "acceptable label" };
}
