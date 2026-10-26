// Collects claims the agent gave both a political leaning and an ideological leaning, from scored runs,
// for presenting what a full label looks like. This is a selection, not a measurement: the rows are
// chosen because they are labelled, so they say nothing about how often claims get labels.
// Usage: npx tsx scripts/showcase.mts <out.json> <examples.json|fresh.json|rescore.json> [...]
import { readFileSync, writeFileSync } from "node:fs";
import { SPACES } from "../src/config.js";

const [out, ...inputs] = process.argv.slice(2);
if (!out || !inputs.length) throw new Error("usage: showcase.mts <out.json> <results.json> [...]");

const US = SPACES.find((s) => s.slug === "us-politics")!;
const rows = new Map<string, Record<string, unknown>>();
for (const file of inputs) {
  const data = JSON.parse(readFileSync(file, "utf8")) as { name?: string; set?: string; rows: Record<string, any>[] };
  const armando = file.includes("examples.");
  for (const r of data.rows) {
    const ideologies: string[] = armando ? r.published : r.ideologies;
    if (!r.leaning || !ideologies.length) continue;
    const claimId: string = armando ? r.id : r.claimId;
    if (rows.has(claimId)) continue;
    rows.set(claimId, {
      claimId,
      space: armando ? US.slug : r.space,
      spaceId: armando ? US.id : r.spaceId,
      text: r.text,
      published: true,
      display: r.display ?? r.leaning,
      leaning: r.leaning,
      ideologies,
      explanation: r.explanation,
      error: null,
      source: armando ? "Armando's example" : `Geo sample (${data.name ?? file})`,
      armando: armando ? r.armando : null,
    });
  }
}
writeFileSync(out, JSON.stringify({ name: "labelled-showcase", inputs, rows: [...rows.values()] }, null, 2) + "\n");
console.log(`${rows.size} claims with both a political leaning and an ideological leaning → ${out}`);
