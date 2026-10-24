import { IDEOLOGY_CARDS, ISSUES, POLITICAL_LEANING_VALUES } from "./ideologies.js";
import {
  CROSS_CUTTING,
  DIMENSIONS,
  FRAMEWORK_VERSION,
  IDEOLOGY_DEFINITION,
  LEANINGS_PROPERTY_DEFINITION,
  IDEOLOGY_RULES,
  LEANING_BY_SCORE,
  levelRulesText,
  POLITICAL_LEANING_DEFINITION,
  PUBLISH_RULES,
  RULES,
  STANCE_GATE,
} from "./rubric.js";

const leaningOf = (score: number) => LEANING_BY_SCORE[String(score) as keyof typeof LEANING_BY_SCORE];
const cell = (s: string) => s.replaceAll("|", "\\|");

/** The scoring framework as Markdown: docs/FRAMEWORK.md and the Notion framework page. */
export function renderFramework(): string {
  const out: string[] = [
    `# Political leaning and ideology scoring framework (${FRAMEWORK_VERSION})`,
    "",
    "Every classification cites the numbered criteria below. The model finds evidence and matches criteria; code turns the matches into the result and decides whether it is published, so the same matches always give the same result.",
    "",
    "## Definitions",
    "",
    `- **Political leaning**: ${POLITICAL_LEANING_DEFINITION}`,
    `- **Ideology**: ${IDEOLOGY_DEFINITION}`,
    `- **Leanings** (the property the agent fills): ${LEANINGS_PROPERTY_DEFINITION} A claim has at most one political leaning but can have several ideological leanings.`,
    "",
    "Possible results: a **published** leaning (one of Geo's seven) and published ideologies; **No label**, naming the rule that blocked it; or **No political position**, naming the check that failed. There are no partial labels: anything not published is left blank.",
    "",
    "## What each level means",
    "",
    "The scorer, the independent check and the verifier all use these rules, so they place claims on the same scale.",
    "",
    levelRulesText(),
    "",
    "## Step 1: does the claim take a political position?",
    "",
    "All four checks must pass. If one fails, the result is *No political position*, naming the reason.",
    "",
    "| Check | Passes when | Fails when | Reason given |",
    "|---|---|---|---|",
    ...STANCE_GATE.map((g) => `| **${g.id}** ${g.name} | ${cell(g.passes)} | ${cell(g.fails)} | ${g.reason} |`),
    "",
    "## Step 2: score each topic area the claim addresses",
    "",
    "Scores run from −3 (Far left) to +3 (Far right). Each score names the Geo leaning it corresponds to.",
    "",
  ];
  for (const d of DIMENSIONS) {
    out.push(`### ${d.id}: ${d.name}`, "", `Covers: ${d.covers}`, "", "| Criterion | Score | Matches when the claim | Examples |", "|---|---|---|---|");
    for (const cr of d.criteria) {
      out.push(`| **${cr.id}** | ${cr.score > 0 ? "+" : ""}${cr.score} ${leaningOf(cr.score)} | ${cell(cr.text)} | ${cr.examples.map((e) => `"${cell(e)}"`).join("; ")} |`);
    }
    out.push("");
  }
  out.push(
    "### Cross-cutting topics (recorded, never scored)",
    "",
    ...CROSS_CUTTING.map((x) => `- **${x.id}** ${x.name}: ${x.note}`),
    "",
    "## Step 3: combining rules",
    "",
    ...RULES.map((r) => `- **${r.id} ${r.name}.** ${r.text}`),
    "",
    "## Step 4: ideological leanings",
    "",
    "Two kinds, both of Geo type Ideology: **issue leanings** (one side of an issue, such as Pro-life) and **traditions** (classic ideologies, such as Conservative). A claim can have several.",
    "",
    ...IDEOLOGY_RULES.map((r) => `- **${r.id}.** ${r.text}`),
    "",
    "## Step 5: publish or leave blank",
    "",
    "A leaning is published only when every rule below passes. If any fails, the claim gets no label and the failed rules are recorded.",
    "",
    "| Rule | Passes when |",
    "|---|---|",
    ...PUBLISH_RULES.map((r) => `| **${r.id}** ${r.name} | ${cell(r.text)} |`),
    "",
    "Explanations quote the claim only through words checked to be in it, word for word. Notes written by the models are kept apart as unverified reviewer notes.",
    "",
    "## Political leanings",
    "",
    "From Armando's Political leanings table. A claim gets at most one, and never Nonpartisan.",
    "",
    "| Value | Scale | Description | Also called |",
    "|---|---|---|---|",
    ...POLITICAL_LEANING_VALUES.map(
      (v) => `| **${v.name}** | ${v.scale ?? "off the scale"} | ${cell(v.description ?? v.note ?? "")} | ${cell(v.alternativeNames.join("; "))} |`,
    ),
    "",
    "## Issue leanings",
    "",
    "One side of a political issue (Armando's \"Ideological leanings\" table). Values marked *not on Geo yet* are labelled but never put in a Geo proposal.",
    "",
  );
  for (const { issue, group, sides } of ISSUES) {
    out.push(`### ${issue} (${group})`, "", "| Leaning | Description | Also called |", "|---|---|---|");
    for (const c of sides) {
      out.push(`| **${c.name}**${c.geoId ? "" : " *(not on Geo yet)*"} | ${cell(c.definition)} | ${cell(c.aliases.join("; "))} |`);
    }
    out.push("");
  }
  out.push("## Traditions", "", "Classic ideologies. A tradition applies when the claim's position is characteristic of it (rule I2).", "");
  for (const card of IDEOLOGY_CARDS.filter((c) => c.kind === "tradition")) {
    out.push(
      `### ${card.name} (${card.status})`,
      "",
      card.definition,
      "",
      ...card.tenets.map((t) => `- **${t.id}** ${t.text}`),
      ...card.exclusions.map((e) => `- Not this tradition: ${e}`),
      `- Related: ${card.neighbours.length ? card.neighbours.join(", ") : "none"}`,
      `- Usually found at: ${card.typicalLeanings.join(", ")}`,
      `- Source: ${card.source}`,
      "",
    );
  }
  return out.join("\n");
}
