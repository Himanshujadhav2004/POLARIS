import { IDEOLOGY_CARDS } from "./ideologies.js";
import {
  CONFIDENCE,
  CROSS_CUTTING,
  DIMENSIONS,
  FRAMEWORK_VERSION,
  IDEOLOGY_DEFINITION,
  IDEOLOGY_RULES,
  LEANING_BY_SCORE,
  POLITICAL_LEANING_DEFINITION,
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
    "Every classification cites the numbered criteria below. The model finds evidence and matches criteria; code turns the matches into the final leaning and confidence, so the same matches always give the same result.",
    "",
    "## Definitions",
    "",
    `- **Political leaning**: ${POLITICAL_LEANING_DEFINITION}`,
    `- **Ideology**: ${IDEOLOGY_DEFINITION}`,
    "",
    "Possible results: one of Geo's seven leanings (Far left … Far right), each marked **Clear** or **Potential**; **Uncertain** (with the reason); or **No political position** (with the check that failed).",
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
    "## Step 4: ideologies",
    "",
    ...IDEOLOGY_RULES.map((r) => `- **${r.id}.** ${r.text}`),
    "",
    "Each ideology has a definition card (below). A belief marked *distinctive* belongs to that ideology alone; a *shared* belief gives at most Potential.",
    "",
    "## Step 5: confidence (0–100)",
    "",
    "| Part | Points | How it is scored |",
    "|---|---|---|",
    ...CONFIDENCE.components.map((c) => `| ${c.id} | ${c.max} | ${cell(c.text)} |`),
    "",
    `Bands: ${CONFIDENCE.bands.map((b) => `**${b.name}** (${b.min}+) → ${b.qualifier}`).join(", ")}. ${CONFIDENCE.note}`,
    "",
    "## Ideology definition cards",
    "",
  );
  for (const card of IDEOLOGY_CARDS) {
    out.push(
      `### ${card.name} (${card.status})`,
      "",
      card.definition,
      "",
      ...card.tenets.map((t) => `- **${t.id}** ${t.text} *(${t.distinctive ? "distinctive" : "shared"})*`),
      ...card.exclusions.map((e) => `- Not this ideology: ${e}`),
      `- Neighbours: ${card.neighbours.length ? card.neighbours.join(", ") : "none"}`,
      `- Usually found at: ${card.typicalLeanings.join(", ")}`,
      `- Source: ${card.source}`,
      "",
    );
  }
  return out.join("\n");
}
