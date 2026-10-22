# POLARIS: Leanings agent

Labels Geo claims with the **Political leaning** and **Ideology** they express, filling the claim's **Leanings** property. Results go to a QA spreadsheet first, then to a local dry run of the Geo operations. Proposals are made by hand.

See [docs/PLAN.md](docs/PLAN.md) for scope, decisions and phases.

## Setup

```sh
npm install
cp .env.example .env   # then set OPENAI_API_KEY
npm run typecheck
npm test
```

Requires Node 22.13 or later. Reading from Geo needs no key.

## Scoring framework

The written criteria every classification must cite live in `src/framework/` and are rendered to [docs/FRAMEWORK.md](docs/FRAMEWORK.md) (`npm run cli -- framework`):

- a political-position check (G1–G4);
- five topic areas scored from −3 to +3, each score a numbered criterion;
- combining rules;
- 28 ideology definition cards (drafts until Armando approves them);
- the confidence formula.

### Agent v3 (scoring)

`npm run cli -- score <claim-id>` or `score-text "<sentence>"` returns, for each claim:
- a result: one of Geo's leanings marked **Clear** or **Potentially …**, **Uncertain** (with the reason), or **No political position** (with the failed check);
- the criteria matched, each with the exact words from the claim;
- ideologies with the belief they match;
- a 0–100 confidence split into its parts;
- a plain explanation and any flags.

Four signals feed each result:
1. **The scorer (gpt-5.5)** matches criteria and quotes evidence.
2. **OpenAI's Decisions API (gpt-6-luna)** gives independent probabilities for the stance, the 7 leanings and each ideology.
3. **A verifier (gpt-5.5, high reasoning)** judges the leaning and each ideology separately.
4. **A focused second look** checks any ideology the independent probabilities rate highly but the scorer missed.

Code turns these into the result; `src/agent/v3/score.ts` holds every rule, with unit tests. `npm run cli -- eval3` runs v3 over the dev set.

**Submissions to Geo are paused** (`SUBMISSIONS_PAUSED` in `src/config.ts`) while the scoring system is built and tested.

## Commands

```sh
npm run cli -- taxonomy                 # values the agent may use (live from Geo)
npm run cli -- counts                   # claims per target space
npm run cli -- claim <id>               # a claim with the context the agent sees
npm run cli -- sample <space> --count 10 --seed 1
npm run cli -- schema                   # refresh schema/geo-schema.json from the live API

npm run cli -- classify <id>            # label claims (needs OPENAI_API_KEY)
npm run cli -- eval --models gpt-5.5,gpt-5.4-mini
npm run cli -- qa-sample --seed 2          # writes qa/<prompt>-seed2/qa_sample.xlsx, .csv, .json
npm run cli -- qa-report --dir qa/v2-seed2 --out qa/v2-seed2/report.md
```

Proposals (a local dry run; nothing is sent to Geo):

```sh
npm run cli -- dry-run --space us-politics --count 10       # candidates through every check
npm run cli -- dry-run --space us-politics --only <id,id>  # after manual review: exactly these claims
npm run cli -- check-proposal --dir proposals/us-politics/batch-01   # after the proposal executes
npm run cli -- submit --dir proposals/us-politics/batch-02          # read-only checks, sends nothing
npm run cli -- submit --dir proposals/us-politics/batch-02 --yes    # send the proposal (needs GEO_PRIVATE_KEY)
```

Each batch folder holds `proposal.md` (review checklist, claims, reasons, how to submit), `proposal.json`, `proposal.csv` and `ops.json` (the exact `createRelation` operations, built with the Geo SDK).

Each QA round gets its own folder under `qa/`, and a new sample skips claims from the dev set and earlier rounds. Reviewers fill in the yellow columns of the round's `qa_sample.xlsx` (QA verdict, plus Correct leaning / Correct ideologies when it is not Correct). `qa-report` matches rows by Claim ID and scores labels and blanks separately against the bar (90% / 85% by default).

Classifications are cached in `data/state.sqlite` per claim, model, prompt version and taxonomy fingerprint, so re-running a command never pays for the same claim twice.

## Layout

```
src/config.ts        Space IDs, Geo IDs, env
src/cli.ts           Command-line entry point
src/geo/client.ts    GraphQL client with retries
src/geo/taxonomy.ts  Political leaning + Ideology values, loaded live
src/geo/claims.ts    Claim fetching, random sampling, cursor paging
src/geo/schema.ts    Live schema introspection
src/util/random.ts   Seeded randomness for reproducible samples
src/agent/prompt.ts  System prompt (PROMPT_VERSION) and claim message
src/agent/schema.ts  Answer schema built from the live taxonomy; label validation
src/agent/classify.ts  OpenAI structured-output call
src/pipeline/        Cached classification runs (SQLite run state)
src/eval/            Dev-set scoring and model comparison
evals/dev-set.json   41 hand-labelled edge cases
evals/results/       Eval output per model and prompt version
src/qa/export.ts     QA spreadsheet, CSV and JSON manifest
src/qa/verdicts.ts   Reads reviewer verdicts from the spreadsheet
src/qa/report.ts     Accuracy report (labels, blanks, per space, issues)
qa/<prompt>-seed<N>/ One folder per QA round: sample, reviews, reports
src/agent/verify.ts  Independent verifier used before publishing
src/publish/         Publishing gate, dry-run proposal files, post-submit check
proposals/           Dry-run proposals, one folder per batch
schema/              Live Geo GraphQL schema
test/                Unit tests (vitest)
docs/PLAN.md         Plan and decisions
```

## Status

| Phase | Status |
|---|---|
| 0 Project scaffold | Done |
| 1 Geo read layer + live taxonomy | Done |
| 2 Classifier + dev-set eval | Done: gpt-5.5 chosen (41/41 vs 35/41 for gpt-5.4-mini) |
| 3 QA sample | Done: 70 rows in `qa/qa_sample.xlsx`, awaiting review |
| 4 Review loop | In progress: AI pre-review shows labels 59% → 83% (v1 → v2) and blanks 100%; human review of `qa/v2-seed2/` pending |
| 5 Full run | Not started |
| 7 Scoring framework v1 | Done: criteria, rules, 28 draft ideology cards, docs/FRAMEWORK.md (now v1.1) |
| 8 Agent v3 | Done: criteria-based scoring, Decisions API probabilities, per-part verifier, ideology second look |
| 6 Proposals to Geo (paused) | Batch 02 (1 claim, 2 links) submitted 2026-10-22 as proposal `0xa1dab347…`, awaiting an editor's vote. Batch 01 (10 claims) ready; rebuild it without the batch-02 claim before sending |
