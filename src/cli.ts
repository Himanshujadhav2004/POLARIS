import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { Classifier } from "./agent/classify.js";
import { PROMPT_VERSION } from "./agent/prompt.js";
import { Verifier } from "./agent/verify.js";
import { OPENAI_MODEL, SPACES, spaceBySlug, SUBMISSIONS_PAUSED } from "./config.js";
import { renderFramework } from "./framework/render.js";
import { renderSummary, runEval } from "./eval/run.js";
import { countClaims, fetchClaims, sampleClaimIds } from "./geo/claims.js";
import { GeoClient } from "./geo/client.js";
import { fetchSchema } from "./geo/schema.js";
import { fetchTaxonomy } from "./geo/taxonomy.js";
import { classifyWithCache } from "./pipeline/classify-claims.js";
import { buildQaSample, previouslyUsedIds } from "./pipeline/qa-sample.js";
import { RunState } from "./pipeline/state.js";
import { buildBatch } from "./publish/batch.js";
import { checkProposal } from "./publish/check.js";
import { idsInProposals, nextBatchDir, writeDryRun } from "./publish/dry-run.js";
import { planSubmission, submit } from "./publish/submit.js";
import { exportQaSample } from "./qa/export.js";
import { computeQaReport, renderQaReport } from "./qa/report.js";
import { readManifest, readVerdicts } from "./qa/verdicts.js";
import { seededRng } from "./util/random.js";

const HELP = `Usage: npm run cli -- <command> [options]

Framework
  framework [--out docs/FRAMEWORK.md]
                               Write the scoring framework (criteria, rules, ideology cards) as Markdown

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
                               Build a reviewer sample in qa/<prompt>-seed<N>/ (skips dev-set and earlier QA claims)
  qa-report --dir qa/<round> [--file <dir>/qa_sample.xlsx] [--out PATH] [--label-bar 0.9] [--blank-bar 0.85]
                               Score reviewer verdicts against the agent's output

Proposals (local dry run only; nothing is sent to Geo)
  dry-run --space <slug> [--count 10] [--pool 80] [--seed N] [--exclude id,id] [--only id,id]
                               Pick claims that pass every check and write proposals/<space>/batch-NN/
                               (--only: after manual review, use exactly these claims)
  check-proposal --dir proposals/<space>/batch-NN
                               After you submit and it executes: confirm the Leanings now on Geo

Submitting (needs GEO_PRIVATE_KEY; sends an on-chain proposal)
  submit --dir proposals/<space>/batch-NN [--yes]
                               Without --yes: read-only checks and a summary of what would be sent.
                               With --yes: upload the edit and send the proposal transaction.
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
      dir: { type: "string" },
      file: { type: "string" },
      out: { type: "string" },
      "label-bar": { type: "string" },
      "blank-bar": { type: "string" },
      space: { type: "string" },
      exclude: { type: "string" },
      only: { type: "string" },
      yes: { type: "boolean" },
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
    case "framework": {
      const out = values.out ?? "docs/FRAMEWORK.md";
      writeFileSync(out, renderFramework() + "\n");
      console.log(`Wrote ${out}`);
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
      const seed = Number(values.seed ?? 1);
      const dir = `qa/${PROMPT_VERSION}-seed${seed}`;
      if (existsSync(`${dir}/qa_sample.json`)) {
        throw new Error(`${dir} already holds a QA round. Use another --seed, or delete the folder to rebuild it.`);
      }
      const taxonomy = await fetchTaxonomy(geo);
      const classifier = new Classifier(taxonomy, { model: values.model });
      const state = new RunState();
      try {
        const sample = await buildQaSample({
          geo,
          classifier,
          state,
          seed,
          excludeIds: previouslyUsedIds(),
          pool: Number(values.pool ?? 60),
          maxRounds: 2,
          perSpace: Number(values["per-space"] ?? 10),
          labelled: Number(values.labelled ?? 6),
          concurrency: Number(values.concurrency ?? 6),
          log: (line) => console.log(line),
        });
        const files = await exportQaSample(sample, taxonomy, dir);
        console.log(`\nWrote ${sample.rows.length} rows:\n${files.map((f) => `  ${f}`).join("\n")}`);
      } finally {
        state.close();
      }
      return;
    }
    case "qa-report": {
      if (!values.dir) throw new Error("Give the QA round folder, e.g. --dir qa/v1-seed1");
      const file = values.file ?? `${values.dir}/qa_sample.xlsx`;
      const report = computeQaReport(readManifest(`${values.dir}/qa_sample.json`), await readVerdicts(file), {
        labels: Number(values["label-bar"] ?? 0.9),
        blanks: Number(values["blank-bar"] ?? 0.85),
      });
      const markdown = renderQaReport(report, file);
      if (values.out) {
        mkdirSync(dirname(values.out), { recursive: true });
        writeFileSync(values.out, markdown);
      }
      console.log(markdown);
      return;
    }
    case "dry-run": {
      const space = spaceBySlug(values.space ?? "");
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const exclude = new Set([...previouslyUsedIds(), ...idsInProposals(), ...(values.exclude ?? "").split(",").map((s) => s.trim()).filter(Boolean)]);
        const batch = await buildBatch({
          geo,
          classifier: new Classifier(taxonomy, { model: values.model }),
          verifier: new Verifier(taxonomy, { model: values.model }),
          state,
          space,
          count: Number(values.count ?? 10),
          pool: Number(values.pool ?? 80),
          seed: Number(values.seed ?? 1),
          concurrency: Number(values.concurrency ?? 6),
          exclude,
          nameIncludes: " should ",
          only: values.only ? new Set(values.only.split(",").map((s) => s.trim()).filter(Boolean)) : undefined,
          log: (line) => console.log(line),
        });
        if (!batch.items.length) throw new Error("No claim passed every check. Try a larger --pool.");
        const dir = nextBatchDir(space.slug);
        const files = writeDryRun(batch, taxonomy, dir);
        console.log(`\n${batch.items.length} claims selected (${batch.spare.length} more passed and are held back)`);
        for (const { claim, classification: c } of batch.items) {
          console.log(`  ${claim.id}  ${[c.label.political_leaning, ...c.label.ideologies].filter(Boolean).join(", ").padEnd(36)} ${claim.text}`);
        }
        const reasons = new Map<string, number>();
        for (const r of batch.rejected) {
          const key = r.reason.startsWith("verifier disagreed") ? "verifier disagreed" : r.reason;
          reasons.set(key, (reasons.get(key) ?? 0) + 1);
        }
        console.log(`\nLeft out ${batch.rejected.length} of ${batch.candidates} candidates:`);
        for (const [reason, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${reason}`);
        console.log(`\nWrote:\n${files.map((f) => `  ${f}`).join("\n")}`);
      } finally {
        state.close();
      }
      return;
    }
    case "check-proposal": {
      if (!values.dir) throw new Error("Give the batch folder, e.g. --dir proposals/us-politics/batch-01");
      const statuses = await checkProposal(geo, values.dir);
      for (const s of statuses) console.log(`${s.status.padEnd(9)} ${s.text}`);
      const done = statuses.filter((s) => s.status === "published").length;
      console.log(`\n${done}/${statuses.length} claims show exactly the proposed Leanings on Geo.`);
      return;
    }
    case "submit": {
      if (!values.dir) throw new Error("Give the batch folder, e.g. --dir proposals/us-politics/batch-02");
      const plan = await planSubmission(geo, values.dir);
      console.log(`Proposal:       ${plan.name}`);
      console.log(`Space:          ${plan.manifest.space} (${plan.manifest.spaceId})`);
      console.log(`Operations:     ${plan.ops.length} createRelation (Leanings)`);
      for (const c of plan.manifest.claims) {
        console.log(`  - ${c.text}  ->  ${[c.politicalLeaning, ...c.ideologies].filter(Boolean).join(", ")}`);
      }
      console.log(`Wallet:         ${plan.account.address}`);
      console.log(`Personal space: ${plan.personalSpaceId ?? "none"}`);
      console.log(`Role in space:  ${plan.role}`);
      if (plan.problems.length) {
        console.log(`\nCannot submit:\n${plan.problems.map((p) => `  - ${p}`).join("\n")}`);
        process.exitCode = 1;
        return;
      }
      if (!values.yes) {
        console.log("\nAll checks passed. Nothing was sent. Re-run with --yes to submit this proposal.");
        return;
      }
      if (SUBMISSIONS_PAUSED) {
        throw new Error("Submissions to Geo are paused (SUBMISSIONS_PAUSED in src/config.ts). Nothing was sent.");
      }
      const result = await submit(plan);
      console.log(`\nSubmitted.\n  proposal ${result.proposalId}\n  tx       ${result.txHash}\n  edit     ${result.cid}`);
      console.log(`Saved ${values.dir}/submission.json. After it is voted through: npm run cli -- check-proposal --dir ${values.dir}`);
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
