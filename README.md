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
```

## Layout

```
src/config.ts        Space IDs, Geo IDs, env
src/cli.ts           Command-line entry point
src/geo/client.ts    GraphQL client with retries
src/geo/taxonomy.ts  Political leaning + Ideology values, loaded live
src/geo/claims.ts    Claim fetching, random sampling, cursor paging
src/geo/schema.ts    Live schema introspection
src/util/random.ts   Seeded randomness for reproducible samples
schema/              Live Geo GraphQL schema
test/                Unit tests (vitest)
docs/PLAN.md         Plan and decisions
```

## Status

| Phase | Status |
|---|---|
| 0 Project scaffold | Done |
| 1 Geo read layer + live taxonomy | Done |
| 2 Classifier + dev-set eval | Not started |
| 3 QA sample | Not started |
| 4 Review loop | Not started |
| 5 Full run | Not started |
| 6 Local dry run for Geo | Not started |
