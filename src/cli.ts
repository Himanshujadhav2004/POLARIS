import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Classifier } from "./agent/classify.js";
import { OPENAI_MODEL, SPACES, spaceBySlug } from "./config.js";
import { renderSummary, runEval } from "./eval/run.js";
import { countClaims, fetchClaims, sampleClaimIds } from "./geo/claims.js";
import { GeoClient } from "./geo/client.js";
import { fetchSchema } from "./geo/schema.js";
import { fetchTaxonomy } from "./geo/taxonomy.js";
import { classifyWithCache } from "./pipeline/classify-claims.js";
import { buildQaSample } from "./pipeline/qa-sample.js";
import { RunState } from "./pipeline/state.js";
import { exportQaSample } from "./qa/export.js";
import { seededRng } from "./util/random.js";

const HELP = `Usage: npm run cli -- <command> [options]

Geo (read-only, no key needed)
  schema                       Save the live Geo GraphQL schema to schema/geo-schema.json
  taxonomy                     List the Political leaning and Ideology values the agent may use
  counts                       Count claims in each target space
  claim <id> [<id>...]         Show claims with the context the agent sees
  sample <space> [--count N] [--seed N]
                               Draw random claims from a space (slugs: ${SPACES.map((s) => s.slug).join(", ")})

Classification (needs OPENAI_API_KEY; results are cached in data/state.sqlite)
  classify <id> [<id>...] [--model M]
                               Label claims and print the result
  eval [--models a,b] [--concurrency N]
                               Score models on evals/dev-set.json; writes evals/results/
  qa-sample [--seed N] [--pool 60] [--per-space 10] [--labelled 6] [--concurrency N]
                               Build the reviewer sample; writes qa/qa_sample.xlsx, .csv and .json
`;

async function main(argv: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      count: { type: "string" },
      seed: { type: "string" },
      model: { type: "string" },
      models: { type: "string" },
      concurrency: { type: "string" },
      pool: { type: "string" },
      "per-space": { type: "string" },
      labelled: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, ...rest] = positionals;
  const geo = new GeoClient();

  switch (values.help ? undefined : command) {
    case "schema": {
      mkdirSync("schema", { recursive: true });
      writeFileSync("schema/geo-schema.json", JSON.stringify(await fetchSchema(geo), null, 1) + "\n");
      console.log("Saved schema/geo-schema.json");
      return;
    }
    case "taxonomy": {
      const taxonomy = await fetchTaxonomy(geo);
      console.log(`Fingerprint ${taxonomy.fingerprint}\n`);
      console.log(`Political leaning (${taxonomy.politicalLeanings.length})`);
      for (const v of taxonomy.politicalLeanings) console.log(`  ${v.id}  ${v.name}`);
      console.log(`\nIdeology (${taxonomy.ideologies.length})`);
      for (const v of taxonomy.ideologies) console.log(`  ${v.id}  ${v.name}`);
      return;
    }
    case "counts": {
      let total = 0;
      for (const space of SPACES) {
        const n = await countClaims(geo, space.id);
        total += n;
        console.log(`${space.name.padEnd(15)} ${n.toLocaleString("en-US").padStart(9)}`);
      }
      console.log(`${"Total".padEnd(15)} ${total.toLocaleString("en-US").padStart(9)}`);
      return;
    }
    case "claim": {
      if (!rest.length) throw new Error("Give at least one claim ID.");
      console.log(JSON.stringify(await fetchClaims(geo, rest), null, 2));
      return;
    }
    case "sample": {
      const space = spaceBySlug(rest[0] ?? "");
      const count = Number(values.count ?? 10);
      const seed = Number(values.seed ?? Date.now() % 2 ** 31);
      const ids = await sampleClaimIds(geo, space.id, count, seededRng(seed));
      console.log(`${space.name}: ${ids.length} random claims (seed ${seed})\n`);
      for (const claim of await fetchClaims(geo, ids)) console.log(`  ${claim.id}  ${claim.text}`);
      return;
    }
    case "classify": {
      if (!rest.length) throw new Error("Give at least one claim ID.");
      const taxonomy = await fetchTaxonomy(geo);
      const classifier = new Classifier(taxonomy, { model: values.model });
      const claims = await fetchClaims(geo, rest);
      const state = new RunState();
      try {
        const outcomes = await classifyWithCache(classifier, state, claims.map((claim) => ({ claim, spaceId: null })), 4);
        for (const claim of claims) {
          const outcome = outcomes.get(claim.id)!;
          console.log(`\n${claim.id}  ${claim.text}`);
          console.log(JSON.stringify("error" in outcome ? outcome : { ...outcome.label, valueIds: outcome.valueIds, usage: outcome.usage }, null, 2));
        }
      } finally {
        state.close();
      }
      return;
    }
    case "eval": {
      const models = (values.models ?? OPENAI_MODEL).split(",").map((m) => m.trim()).filter(Boolean);
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const summaries = await runEval({ geo, taxonomy, state, models, concurrency: Number(values.concurrency ?? 6) });
        console.log(renderSummary(summaries));
      } finally {
        state.close();
      }
      return;
    }
    case "qa-sample": {
      const taxonomy = await fetchTaxonomy(geo);
      const classifier = new Classifier(taxonomy, { model: values.model });
      const state = new RunState();
      try {
        const sample = await buildQaSample({
          geo,
          classifier,
          state,
          seed: Number(values.seed ?? 1),
          pool: Number(values.pool ?? 60),
          maxRounds: 2,
          perSpace: Number(values["per-space"] ?? 10),
          labelled: Number(values.labelled ?? 6),
          concurrency: Number(values.concurrency ?? 6),
          log: (line) => console.log(line),
        });
        const files = await exportQaSample(sample, taxonomy);
        console.log(`\nWrote ${sample.rows.length} rows:\n${files.map((f) => `  ${f}`).join("\n")}`);
      } finally {
        state.close();
      }
      return;
    }
    default:
      console.log(HELP);
  }
}

main(process.argv.slice(2)).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
