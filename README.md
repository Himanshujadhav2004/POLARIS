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
| 4 Review loop | In progress: AI pre-review of prompt v1 shows labels 59% / blanks 100%; prompt v2 next; human review pending |
| 5 Full run | Not started |
| 6 Local dry run for Geo | Not started |
