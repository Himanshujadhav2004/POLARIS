import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { Classifier } from "./agent/classify.js";
import { PROMPT_VERSION } from "./agent/prompt.js";
import { ScoringAgent } from "./agent/v3/agent.js";
import { loadTestSet, runBench, writeBench } from "./eval/bench.js";
import { runEval3 } from "./eval/run3.js";
import { OPENAI_MODEL, SPACES, spaceBySlug, SUBMISSIONS_PAUSED } from "./config.js";
import { renderFramework } from "./framework/render.js";
import { renderSummary, runEval } from "./eval/run.js";
import { countClaims, fetchClaims, sampleClaimIds } from "./geo/claims.js";
import { GeoClient } from "./geo/client.js";
import { fetchSchema } from "./geo/schema.js";
import { fetchTaxonomy } from "./geo/taxonomy.js";
import { classifyWithCache } from "./pipeline/classify-claims.js";
import { loadChallenge, runChallenge, summarizeChallenge, writeChallenge } from "./eval/challenge.js";
import { loadExamples, runExamples, summarizeExamples, writeExamples } from "./eval/examples.js";
import { buildFreshSet, rescoreFreshSet, usedClaimIds, writeFreshSet } from "./pipeline/fresh-set.js";
import { buildQaSample, previouslyUsedIds } from "./pipeline/qa-sample.js";
import { RunState } from "./pipeline/state.js";
import { applyRemovals, buildBatch } from "./publish/batch.js";
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
  score <id> [<id>...] [--json]
                               Agent v3: transparent, criteria-based result for each claim
  score-text "<claim text>" [...] [--json]
                               The same for any sentence (e.g. test claims that are not on Geo)
  eval3 [--concurrency N]      Run agent v3 over evals/dev-set.json; writes evals/results/v3.<framework>.json
  bench [--file evals/test-set-v1.json] [--concurrency N]
                               Run agent v3 over the test set; writes evals/results/bench.<set>.<framework>.json
  examples [--file evals/armando-examples.json] [--concurrency N]
                               Score Armando's example claims; compare with the leanings he linked to each;
                               writes evals/results/examples.<set>.<framework>.json
  challenge [--file evals/challenge-set-v1.json] [--concurrency N]
                               Score the challenge set (written claims for the risky cases) and count wrong and
                               missed labels; writes evals/results/challenge.<set>.<framework>.json
  fresh-rescore [--dir fresh-seed3] [--concurrency N]
                               Score an existing fresh set again with the current framework
  fresh-set [--seed 3] [--pool 10 | --total N] [--spaces us-politics,world-affairs] [--per-space 10] [--labelled 6] [--includes " should | must "] [--concurrency N]
                               Score never-used claims from every space (10 each by default: 70 claims)
                               and pick the 10-per-space QA sample;
                               writes evals/fresh/fresh-seed<N>/fresh.json. With --includes ("|"-separated,
                               case-sensitive) only claims containing one of the texts are drawn:
                               an opinion sample, written to evals/fresh/opinion-seed<N>/
  qa-sample [--seed N] [--pool 60] [--per-space 10] [--labelled 6] [--concurrency N]
                               Build a reviewer sample in qa/<prompt>-seed<N>/ (skips dev-set and earlier QA claims)
  qa-report --dir qa/<round> [--file <dir>/qa_sample.xlsx] [--out PATH] [--label-bar 0.9] [--blank-bar 0.85]
                               Score reviewer verdicts against the agent's output

Proposals (local dry run only; nothing is sent to Geo)
  dry-run --space <slug> (--only id,id | --file ids.txt) [--remove removals.txt] [--concurrency N]
                               Write proposals/<space>/batch-NN/ for the claims chosen after review
                               (one ID per line in --file); a claim the agent no longer publishes is left out.
                               --remove takes labels out after review: "claimId | value name | reason" per line
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
      total: { type: "string" },
      spaces: { type: "string" },
      "per-space": { type: "string" },
      labelled: { type: "string" },
      includes: { type: "string" },
      dir: { type: "string" },
      file: { type: "string" },
      out: { type: "string" },
      "label-bar": { type: "string" },
      "blank-bar": { type: "string" },
      space: { type: "string" },
      exclude: { type: "string" },
      only: { type: "string" },
      remove: { type: "string" },
      yes: { type: "boolean" },
      json: { type: "boolean" },
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
      console.log(`Political position (${taxonomy.politicalLeanings.length})`);
      for (const v of taxonomy.politicalLeanings) console.log(`  ${v.id}  ${v.name}`);
      console.log(`\nPolitical ideology (${taxonomy.ideologies.length})`);
      for (const v of taxonomy.ideologies) console.log(`  ${v.id}  ${v.name}`);
      console.log(`\nIssue position (${taxonomy.issuePositions.length})`);
      for (const v of taxonomy.issuePositions) console.log(`  ${v.id}  ${v.name}`);
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
    case "score":
    case "score-text": {
      if (!rest.length) throw new Error(command === "score" ? "Give at least one claim ID." : 'Give the claim text in quotes.');
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const agent = new ScoringAgent(taxonomy, state, { model: values.model });
        const claims =
          command === "score"
            ? await fetchClaims(geo, rest)
            : rest.map((text) => ({
                id: `text-${createHash("sha256").update(text).digest("hex").slice(0, 16)}`,
                text,
                spaceIds: [],
                isFactual: null,
                context: {},
                leaningIds: [],
              }));
        for (const claim of claims) {
          const r = await agent.score(claim);
          if (values.json) {
            console.log(JSON.stringify(r, null, 2));
            continue;
          }
          console.log(`\n${claim.text}\n${"-".repeat(Math.min(claim.text.length, 100))}`);
          console.log(`Result:      ${r.display}`);
          if (r.ideologies.length) console.log(`Ideology:    ${r.ideologies.map((i) => `${i.name} [${i.tenet}]`).join(", ")}`);
          for (const c of r.criteria) console.log(`Criterion:   ${c.id} (${c.strength}) “${c.evidence}”`);
          for (const c of r.checks) console.log(`Rule:        ${c.id} ${c.skipped ? "skipped" : c.pass ? "pass" : "FAIL"}: ${c.detail}`);
          console.log(`Why:         ${r.explanation}`);
          for (const d of r.droppedIdeologies) console.log(`Not given:   ${d.name}: ${d.reason}`);
          for (const n of r.reviewerNotes) console.log(`Model note:  ${n} (unverified)`);
          if (r.flags.length) console.log(`Flags:       ${r.flags.join("; ")}`);
        }
      } finally {
        state.close();
      }
      return;
    }
    case "eval3": {
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const agent = new ScoringAgent(taxonomy, state, { model: values.model });
        const { summary } = await runEval3(geo, agent, Number(values.concurrency ?? 4));
        console.log(JSON.stringify(summary, null, 2));
      } finally {
        state.close();
      }
      return;
    }
    case "bench": {
      const set = loadTestSet(values.file ?? "evals/test-set-v1.json");
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const agent = new ScoringAgent(taxonomy, state, { model: values.model });
        const { rows, summary } = await runBench(geo, agent, set, Number(values.concurrency ?? 4));
        console.log(JSON.stringify(summary, null, 2));
        console.log(`Wrote ${writeBench(rows, summary)}`);
      } finally {
        state.close();
      }
      return;
    }
    case "examples": {
      const set = loadExamples(values.file ?? "evals/armando-examples.json");
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const agent = new ScoringAgent(taxonomy, state, { model: values.model });
        const rows = await runExamples(geo, agent, set.items, Number(values.concurrency ?? 4));
        const summary = summarizeExamples(set.version, rows);
        console.log(JSON.stringify(summary, null, 2));
        console.log(`Wrote ${writeExamples(rows, summary)}`);
      } finally {
        state.close();
      }
      return;
    }
    case "challenge": {
      const set = loadChallenge(values.file ?? "evals/challenge-set-v1.json");
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const agent = new ScoringAgent(taxonomy, state, { model: values.model });
        const rows = await runChallenge(agent, set.items, Number(values.concurrency ?? 4));
        const summary = summarizeChallenge(set.version, rows);
        console.log(JSON.stringify(summary, null, 2));
        console.log(`Wrote ${writeChallenge(rows, summary)}`);
      } finally {
        state.close();
      }
      return;
    }
    case "fresh-rescore": {
      const name = values.dir ?? "fresh-seed3";
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const agent = new ScoringAgent(taxonomy, state, { model: values.model });
        const { file, rows } = await rescoreFreshSet(geo, agent, name, Number(values.concurrency ?? 4));
        const published = rows.filter((r) => r.result && (r.result.leaning || r.result.ideologies.length));
        console.log(`${rows.length} claims rescored, ${published.length} with a published label, ${rows.filter((r) => r.error).length} errors`);
        console.log(`Wrote ${file}`);
      } finally {
        state.close();
      }
      return;
    }
    case "fresh-set": {
      const seed = Number(values.seed ?? 3);
      const includes = values.includes?.split("|").filter((t) => t.trim());
      const name = `${includes?.length ? "opinion" : "fresh"}-seed${seed}`;
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const agent = new ScoringAgent(taxonomy, state, { model: values.model });
        const { rows, stats } = await buildFreshSet({
          includes,
          geo,
          agent,
          seed,
          pool: Number(values.pool ?? 10),
          total: values.total === undefined ? undefined : Number(values.total),
          spaces: values.spaces?.split(",").map((s) => s.trim()),
          perSpace: Number(values["per-space"] ?? 10),
          labelled: Number(values.labelled ?? 6),
          concurrency: Number(values.concurrency ?? 4),
          exclude: usedClaimIds(),
          log: (line) => console.log(line),
        });
        console.log(`Wrote ${writeFreshSet(name, seed, rows, stats)}`);
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
      if (!values.only && !values.file) {
        throw new Error("Give the claims chosen for this proposal: --only id,id or --file ids.txt (one ID per line). Nothing else is ever proposed.");
      }
      const listed = values.only ? values.only.split(",") : readFileSync(values.file!, "utf8").split(/\r?\n/);
      const approved = new Set(listed.map((s) => s.trim()).filter((s) => s && !s.startsWith("#")));
      const taken = [...approved].filter((id) => idsInProposals().has(id));
      if (taken.length) throw new Error(`Already in a proposal batch: ${taken.join(", ")}`);
      const taxonomy = await fetchTaxonomy(geo);
      const state = new RunState();
      try {
        const agent = new ScoringAgent(taxonomy, state, { model: values.model });
        const built = await buildBatch({ geo, agent, taxonomy, space, approved, concurrency: Number(values.concurrency ?? 4), log: (line) => console.log(line) });
        const batch = values.remove ? { ...built, items: applyRemovals(built.items, readFileSync(values.remove, "utf8").split(/\r?\n/), taxonomy) } : built;
        for (const item of batch.items) for (const r of item.removed ?? []) console.log(`  removed after review: ${r.name} from ${item.claim.id} (${r.reason})`);
        for (const r of batch.rejected) console.log(`  left out ${r.claim.id}: ${r.reason}`);
        if (!batch.items.length) throw new Error("None of the approved claims still passes every publish rule.");
        const dir = nextBatchDir(space.slug);
        const files = writeDryRun(batch, taxonomy, dir);
        console.log(`\n${batch.items.length} claims in the batch:`);
        for (const { claim, result } of batch.items) {
          console.log(`  ${claim.id}  ${[result.leaning, ...result.ideologies.map((i) => i.name)].filter(Boolean).join(", ").padEnd(48)} ${claim.text}`);
        }
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
      for (const c of plan.manifest.claims) console.log(`  - ${c.text}  ->  ${c.relations.map((r) => r.valueName).join(", ")}`);
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
