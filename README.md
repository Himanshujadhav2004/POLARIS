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

## Layout

```
src/config.ts      Space IDs, Geo IDs, env
docs/PLAN.md       Plan and decisions
```

## Status

| Phase | Status |
|---|---|
| 0 Project scaffold | Done |
| 1 Geo read layer + live taxonomy | Not started |
| 2 Classifier + dev-set eval | Not started |
| 3 QA sample | Not started |
| 4 Review loop | Not started |
| 5 Full run | Not started |
| 6 Local dry run for Geo | Not started |
