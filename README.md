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
npm run cli -- qa-sample --seed 1          # writes qa/qa_sample.xlsx, .csv, .json
```

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
qa/                  The current QA sample for reviewers
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
| 4 Review loop | Not started |
| 5 Full run | Not started |
| 6 Local dry run for Geo | Not started |
