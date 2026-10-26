import type OpenAI from "openai";
import type { Decision, DecisionCreateParams } from "openai/resources/decisions";
import { CARD_BY_NAME, IDEOLOGY_CARDS } from "../../framework/ideologies.js";
import { ALIAS_RULE, EFFECT_RULE, LEANINGS_LEFT_TO_RIGHT, LEVEL_RULES, STANCE_GATE, type LeaningName } from "../../framework/rubric.js";
import type { Claim } from "../../geo/claims.js";
import type { Taxonomy } from "../../geo/taxonomy.js";
import { spaceNames } from "./prompt.js";

export const DECISIONS_MODEL = "gpt-6-luna";

/** Independent probabilities from the Decisions API. No reasoning or evidence: a numeric cross-check. */
export interface DecisionSignals {
  /** Probability that the claim takes a political position. */
  pStance: number;
  /** Probability of each of the 7 leanings. */
  leaning: Record<LeaningName, number>;
  /** Probability-weighted index on the 7-point scale (0 = Far left … 6 = Far right). */
  leaningScore: number;
  /** Probability that the claim clearly advances each ideology, by card name. */
  ideologies: Record<string, number>;
  /** Questions the API refused or did not answer, even after one retry. */
  refusals: string[];
  /** The ideological leanings among them, by card name: their probability is unknown, not 0. */
  unansweredIdeologies: string[];
}

const LEANINGS = LEANINGS_LEFT_TO_RIGHT;
const ideologyQuestionName = (i: number) => `ideology_${i}`;

type Question = DecisionCreateParams["questions"][number];

export function buildDecisionQuestions(taxonomy: Taxonomy): Question[] {
  // Geo's description plus the framework's level rule, so this check and the scorer use the same scale.
  const describe = (name: LeaningName) => {
    const geo = taxonomy.politicalLeanings.find((v) => v.name === name)?.description;
    return `${geo ? `${geo} ` : ""}In this framework: ${LEVEL_RULES[name]}`;
  };
  return [
    {
      type: "predicate",
      name: "stance",
      instructions:
        "Does the claim itself, in its own voice, take a contested political position? It counts only when all of these hold: " +
        STANCE_GATE.map((g) => `${g.name.toLowerCase()} (${g.passes} Not: ${g.fails})`).join("; ") +
        `. ${EFFECT_RULE} Reports of what someone said, statistics, neutral descriptions, advice and widely shared principles do not count.`,
    },
    {
      type: "score",
      name: "leaning",
      instructions:
        "Where on the left-right political spectrum does the position this claim itself advocates sit, relative to the mainstream politics of the country it concerns?",
      levels: LEANINGS.map((name) => ({ label: name, description: describe(name) })),
    },
    ...IDEOLOGY_CARDS.map(
      (card, i): Question => ({
        type: "predicate",
        name: ideologyQuestionName(i),
        instructions:
          card.kind === "issue"
            ? `Does the claim itself, in its own voice, take the side "${card.name}" on the issue ${card.issue}? ${card.name}: ${card.definition} ` +
              // Armando's alternative names set the scope of a side (e.g. "Pro-foreign aid cuts"), as in the scorer prompt.
              // Without ALIAS_RULE the check matched words instead of sides (v3.1: Gender-critical 0.54
              // on "Gender identity should take precedence over biological sex").
              (card.aliases.length ? `Also called: ${card.aliases.join("; ")}. ${ALIAS_RULE} ` : "") +
              `The other side: ${card.neighbours.map((n) => `${n}: ${CARD_BY_NAME.get(n)?.definition ?? ""}`).join(" ")} ` +
              // Not the full EFFECT_RULE: appended to every issue question it lowered the probability of clear
              // sides too (v3.4 A/B: Armando's issue labels clearing the bar fell from 30 to 21 of 42).
              "It counts only if the claim argues for this side, directly or by asserting an effect that this side uses as its argument; mentioning the issue or reporting someone else's view does not count."
            : `Is the position this claim itself takes characteristic of the ideology "${card.name}" (${card.definition}), meaning its adherents typically hold that position, even if the claim does not name it? ` +
              `Characteristic positions: ${card.tenets.map((t) => t.text).join(" / ")}` +
              (card.exclusions.length ? ` It does not count when: ${card.exclusions.join(" ")}` : "") +
              " It counts only when the position is distinctive of this ideology, not simply the mainstream left or right position." +
              ` Never decide from the topic alone. ${EFFECT_RULE}`,
      }),
    ),
  ];
}

/**
 * Maps a Decisions response back to named signals. A refused or missing answer is recorded as such:
 * its probability stays 0, but unansweredIdeologies says it is unknown, so it can never rule a side out.
 */
export function parseDecision(answers: Decision["answers"], questionNames?: readonly string[]): DecisionSignals {
  const signals: DecisionSignals = {
    pStance: 0,
    leaning: Object.fromEntries(LEANINGS.map((l) => [l, 0])) as Record<LeaningName, number>,
    leaningScore: 3,
    ideologies: Object.fromEntries(IDEOLOGY_CARDS.map((c) => [c.name, 0])),
    refusals: [],
    unansweredIdeologies: [],
  };
  const answered = new Set<string>();
  for (const a of answers) {
    if (questionNames && a.name && !questionNames.includes(a.name)) throw new Error(`Decisions API answered a question that was not asked: ${a.name}`);
    if (a.type === "refusal") {
      signals.refusals.push(a.name ?? "(unnamed)");
      continue;
    }
    if (a.name) answered.add(a.name);
    if (a.name === "stance" && a.type === "predicate") signals.pStance = a.probability;
    else if (a.name === "leaning" && a.type === "score") {
      signals.leaningScore = a.score;
      for (const p of a.probabilities) {
        const name = LEANINGS[p.value];
        if (name) signals.leaning[name] = p.probability;
      }
    } else if (a.type === "predicate" && a.name?.startsWith("ideology_")) {
      const card = IDEOLOGY_CARDS[Number(a.name.slice("ideology_".length))];
      if (card) signals.ideologies[card.name] = a.probability;
    }
  }
  // A question with no answer at all counts as refused.
  for (const name of questionNames ?? []) if (!answered.has(name) && !signals.refusals.includes(name)) signals.refusals.push(name);
  signals.unansweredIdeologies = signals.refusals
    .filter((n) => n.startsWith("ideology_"))
    .map((n) => IDEOLOGY_CARDS[Number(n.slice("ideology_".length))]?.name)
    .filter((n): n is string => n !== undefined);
  return signals;
}

export async function getDecisionSignals(client: OpenAI, questions: Question[], claim: Claim): Promise<DecisionSignals> {
  const spaces = spaceNames(claim);
  // JSON-escaped, so quotes inside the claim cannot end it early.
  const input =
    `Claim: ${JSON.stringify(claim.text)}` +
    (spaces.length ? `\nGeo space: ${spaces.join(", ")} (background only: the space never shows which side the claim takes)` : "");
  const names = questions.map((q) => q.name!);
  const first = await client.decisions.create({ model: DECISIONS_MODEL, input, questions });
  const refused = new Set(parseDecision(first.answers, names).refusals);
  if (!refused.size) return parseDecision(first.answers, names);
  // One retry for the refused or missing questions only.
  const retry = await client.decisions.create({ model: DECISIONS_MODEL, input, questions: questions.filter((q) => refused.has(q.name!)) });
  return parseDecision([...first.answers.filter((a) => a.type !== "refusal" && !refused.has(a.name ?? "")), ...retry.answers], names);
}
