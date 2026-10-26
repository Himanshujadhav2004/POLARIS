// Writes the Notion presentation page (Markdown, Notion-flavoured) from the framework itself, so the page
// shows exactly what the agent runs: political leanings, ideology definitions, the scoring framework.
// Usage: npx tsx scripts/presentation-page.mts <out.md> [--short <showcase.json>]
//   --short: short sections only, plus the definitions of the issue leanings the showcase rows use.
import { readFileSync, writeFileSync } from "node:fs";
import { CARD_BY_NAME, IDEOLOGY_CARDS, ISSUES, POLITICAL_LEANING_VALUES } from "../src/framework/ideologies.js";
import {
  CROSS_CUTTING,
  DIMENSIONS,
  IDEOLOGY_DEFINITION,
  IDEOLOGY_RULES,
  LEANING_BY_SCORE,
  LEANINGS_LEFT_TO_RIGHT,
  LEVEL_RULES,
  POLITICAL_LEANING_DEFINITION,
  PUBLISH,
  PUBLISH_RULES,
  RULES,
  STANCE_GATE,
} from "../src/framework/rubric.js";

const [out, mode, showcaseFile] = process.argv.slice(2);
if (!out || (mode && (mode !== "--short" || !showcaseFile))) throw new Error("usage: presentation-page.mts <out.md> [--short <showcase.json>]");

const cell = (s: string) => s.replaceAll("|", "\\|").replaceAll("\n", " ");
// The page presents the agent on its own terms: rule texts name no person.
const neutral = (s: string) =>
  s.replace("Traditions (Armando's convention): assign", "Traditions: assign").replace("(in Armando's table Left is also called", "(Left is also called");
const leaningOf = (score: number) => LEANING_BY_SCORE[String(score) as keyof typeof LEANING_BY_SCORE];
const scoreOf = (name: string) => LEANINGS_LEFT_TO_RIGHT.indexOf(name as never) - 3;
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

const levels = POLITICAL_LEANING_VALUES.filter((v) => LEANINGS_LEFT_TO_RIGHT.includes(v.name as never));
const traditions = IDEOLOGY_CARDS.filter((c) => c.kind === "tradition");
const issueCount = IDEOLOGY_CARDS.filter((c) => c.kind === "issue").length;
const publishTable = ["| Rule | Passes when |", "|---|---|", ...PUBLISH_RULES.map((r) => `| **${r.id}** ${r.name} | ${cell(r.text)} |`)];

function fullPage(): string[] {
  const lines: string[] = [];
  const push = (...xs: string[]) => lines.push(...xs);

  push(
    "## 1. Political leaning",
    "",
    `**Definition:** ${POLITICAL_LEANING_DEFINITION}`,
    "",
    "A claim gets **at most one** political leaning, on a seven-level scale. The scale follows US politics, so only claims about US politics get one.",
    "",
    "| Level | Score | Description | When the agent gives it |",
    "|---|---|---|---|",
    ...levels.map(
      (v) => `| **${v.name}** | ${signed(scoreOf(v.name))} | ${cell(v.description ?? "")} | ${cell(LEVEL_RULES[v.name as keyof typeof LEVEL_RULES])} |`,
    ),
    "",
  );

  push(
    "## 2. Ideology definitions",
    "",
    `**Definition:** ${IDEOLOGY_DEFINITION}`,
    "",
    `A claim can have **several** ideological leanings (up to 5), of two kinds: **${issueCount} issue leanings**, each one side of a political issue, and **${traditions.length} traditions**, the classic ideologies.`,
    "",
    `### Traditions (${traditions.length})`,
    "",
    "| Tradition | Definition | Positions its adherents typically hold |",
    "|---|---|---|",
    ...traditions.map((c) => `| **${c.name}** | ${cell(c.definition)} | ${cell(c.tenets.map((t) => t.text).join(" · "))} |`),
    "",
    `### Issue leanings (${issueCount} sides of ${ISSUES.length} issues)`,
    "",
  );
  for (const group of [...new Set(ISSUES.map((i) => i.group))]) {
    const issues = ISSUES.filter((i) => i.group === group);
    push(
      `<toggle heading="h4">`,
      `${group} (${issues.length} issues)`,
      "",
      "| Issue | Side | Description |",
      "|---|---|---|",
      ...issues.flatMap(({ issue, sides }) => sides.map((c) => `| ${cell(issue)} | **${c.name}** | ${cell(c.definition)} |`)),
      "</toggle>",
      "",
    );
  }

  push(
    "## 3. Scoring framework",
    "",
    "Every result cites numbered criteria and quotes the claim's exact words. Three models read each claim separately, and code, not a model, decides whether a label is published:",
    "",
    "1. **Scorer**: answers the position checks, matches the numbered criteria and proposes ideological leanings, each with the claim's exact words as evidence.",
    "2. **Independent check**: gives a probability for the claim taking a position, for each of the seven levels and for every ideological leaning. It never sees the scorer's answer.",
    "3. **Verifier**: reviews the proposed result against the full framework, twice; both reviews must agree.",
    "4. **Code**: checks every quote word for word against the claim, applies the rules below, and publishes a label only when every rule passes. Otherwise the claim is left blank and the rule that stopped it is recorded.",
    "",
    "A missing label is acceptable; a wrong one is not.",
    "",
    "### Step 1: does the claim take a political position?",
    "",
    "All four checks must pass. Otherwise the result is **No political position**.",
    "",
    "| Check | Passes when | Fails when |",
    "|---|---|---|",
    ...STANCE_GATE.map((g) => `| **${g.id}** ${g.name} | ${cell(g.passes)} | ${cell(g.fails)} |`),
    "",
    "### Step 2: score each topic area the claim takes a position on",
    "",
    "Scores run from −3 (Far left) to +3 (Far right). A criterion's ID encodes its score: ECO-2L is −2 (Left), NAT-2R is +2 (Right), SOC-0 is 0 (Center).",
    "",
  );
  for (const d of DIMENSIONS) {
    push(
      `<toggle heading="h4">`,
      `${d.id}: ${d.name}`,
      "",
      `Covers: ${d.covers}`,
      "",
      "| Criterion | Score | Matches when the claim | Example |",
      "|---|---|---|---|",
      ...d.criteria.map((c) => `| **${c.id}** | ${signed(c.score)} ${leaningOf(c.score)} | ${cell(c.text)} | "${cell(c.examples[0] ?? "")}" |`),
      "</toggle>",
      "",
    );
  }
  push(
    "**Cross-cutting topics** (recorded, never scored, so they get no political leaning; they can still get ideological leanings):",
    "",
    ...CROSS_CUTTING.map((x) => `- **${x.id}** ${x.name}: ${x.note}`),
    "",
    "### Step 3: combining rules",
    "",
    ...RULES.map((r) => `- **${r.id} ${r.name}.** ${neutral(r.text)}`),
    "",
    "### Step 4: ideological leanings",
    "",
    ...IDEOLOGY_RULES.map((r) => `- **${r.id}.** ${neutral(r.text)}`),
    "",
    "### Step 5: publish or leave blank",
    "",
    "A political leaning is published only when every rule passes.",
    "",
    ...publishTable,
    "",
  );
  return lines;
}

type ShowcaseRow = { leaning: string | null; ideologies: string[] };

// The short page: definitions and how a label is decided, then the results heading the table goes under.
function shortPage(rows: ShowcaseRow[]): string[] {
  const used = [...new Set(rows.flatMap((r) => r.ideologies))];
  const count = (leaning: string) => rows.filter((r) => r.leaning === leaning).length;
  const usedIssues = ISSUES.flatMap(({ issue, sides }) => sides.filter((c) => used.includes(c.name)).map((c) => ({ issue, card: c })));
  const unknown = used.filter((name) => !CARD_BY_NAME.has(name));
  if (unknown.length) throw new Error(`Showcase leanings missing from the framework: ${unknown.join(", ")}`);

  return [
    "## Political leaning",
    "",
    `**Definition:** ${POLITICAL_LEANING_DEFINITION}`,
    "",
    "A claim gets **at most one** political leaning, on a seven-level scale. The scale follows US politics, so only claims about US politics get one.",
    "",
    "| Level | Score | Description |",
    "|---|---|---|",
    ...levels.map((v) => `| **${v.name}** | ${signed(scoreOf(v.name))} | ${cell(v.description ?? "")} |`),
    "",
    "## Ideology definition",
    "",
    `**Definition:** ${IDEOLOGY_DEFINITION}`,
    "",
    `A claim can have up to ${PUBLISH.maxIdeologies} ideological leanings, of two kinds:`,
    "",
    `- **Issue leanings** (${issueCount}): one side of a political issue, such as Pro-life or Pro-choice on Abortion.`,
    `- **Traditions** (${traditions.length}): the classic ideologies, given only when the claim's position is distinctive of the tradition, not simply the mainstream left or right position.`,
    "",
    `### Traditions (${traditions.length})`,
    "",
    "| Tradition | Definition |",
    "|---|---|",
    ...traditions.map((c) => `| **${c.name}** | ${cell(c.definition)} |`),
    "",
    `<toggle heading="h3">`,
    `Issue leanings used in the results (${usedIssues.length})`,
    "",
    "| Issue | Side | Description |",
    "|---|---|---|",
    ...usedIssues.map(({ issue, card }) => `| ${cell(issue)} | **${card.name}** | ${cell(card.definition)} |`),
    "</toggle>",
    "",
    "## Scoring framework",
    "",
    "Three models read each claim separately: a **scorer**, an **independent check** that never sees the scorer's answer, and a **verifier** that reviews the result twice. Code, not a model, decides whether a label is published. A missing label is acceptable; a wrong one is not.",
    "",
    `1. **Does the claim take a political position?** All four checks must pass: ${STANCE_GATE.map((g) => `${g.id} ${g.name.toLowerCase()}`).join(", ")}. Otherwise the claim gets no label.`,
    `2. **Score each topic area.** ${DIMENSIONS.map((d) => d.name).join("; ")}: each is scored from −3 (Far left) to +3 (Far right) against numbered criteria. A criterion's ID encodes its score: ECO-2L is −2 (Left), SOC-2R is +2 (Right).`,
    `3. **Find the ideological leanings.** Each one quotes the claim's exact words as evidence; "belief T1" in an explanation is the numbered position on the leaning's card that those words match.`,
    "4. **Publish or leave blank.** Code checks every quote word for word against the claim. The political leaning is published only when every rule below passes:",
    "",
    ...publishTable.map((row) => row.replace(" (rule C1)", "")),
    "",
    `An ideological leaning is published when its quote is found word for word, the independent check gives it at least ${PUBLISH.minIssue} (${PUBLISH.minTradition} for a tradition backed by another published label) with every other side of its issue at most ${PUBLISH.maxOtherSide}, the verifier agrees in all ${PUBLISH.verifierChecks} checks and all ${PUBLISH.runs} runs find it.`,
    "",
    `## Results: ${rows.length} claims`,
    "",
    `${rows.length} Geo claims where the agent published both a political leaning and at least one ideological leaning: ${LEANINGS_LEFT_TO_RIGHT.filter((l) => count(l))
      .map((l) => `**${count(l)} ${l}**`)
      .join(", ")}, using ${used.length} different ideological leanings. Open the Geo link on any row to see the claim on Geo; the explanation shows the criteria, quotes, probabilities and checks behind each label.`,
    "",
  ];
}

const lines = mode ? shortPage(JSON.parse(readFileSync(showcaseFile!, "utf8")).rows as ShowcaseRow[]) : fullPage();
const md = lines.join("\n");
if (/Armando/.test(md)) throw new Error("The presentation page still names a person");
writeFileSync(out, md);
console.log(`${md.length} chars → ${out}`);
