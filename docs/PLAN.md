# Leanings agent: plan

## Goal

Fill the **Leanings** property on Geo claims with a Political leaning and/or an Ideology, only where the claim's own content supports it. Hand reviewers a QA sample of 10 claims per space before anything reaches Geo.

## Scope

| Space | Space ID | Claims (2026-10-22) |
|---|---|---|
| US Politics | `4582fbbee28a16589154f7e36f1ee3c5` | 28,132 |
| Health | `52c7ae149838b6d47ce0f3b2a5974546` | 32,872 |
| Crypto | `c9f267dcb0d270718c2a3c45a64afd32` | 39,498 |
| AI | `41e851610e13a19441c4d980f2f2ce6b` | 29,336 |
| World affairs | `89bd89bf28ff8a0963faf92a8c905e20` | 40,414 |
| Podcasts | `b5a31f8182b042437ede0f84ee02f104` | 216,887 |
| Relationships | `224406e0de3c48d78ef12774111b8b2f` | 2,506 |
| **Total** | | **389,645** |

## Decisions

- **Model:** OpenAI `gpt-5.5`. On the 41-claim dev set (prompt v1) it passed 41/41 and `gpt-5.4-mini` passed 35/41. Mini labelled a reported statement and picked "Zionist" for a two-state claim, which are the errors that matter most here. See `evals/results/`.
  - gpt-5.5 averaged 2,616 input tokens (about 1,700 of them served from OpenAI's prompt cache) and 193 output tokens per claim.
- **QA output:** a local spreadsheet (`qa/qa_sample.xlsx` plus a CSV). No Notion.
- **Ideology duplicate:** `Libertarianism` is canonical. The agent never outputs `Libertarian` (`f69a3a6e…`).
- **Geo writes:** the agent only writes a **local dry run** (operations plus a readable list). A person makes the proposals by hand.
- **QA sample mix:** about 6 claims the agent labelled and 4 it left blank, per space.

## Geo facts the design relies on

- **Read API:** `https://api-testnet.geobrowser.io/graphql`. Public, no key, read-only.
- **Leanings** (`ff40a847…`) is a Relation property whose targets are restricted to **Political leaning** (`efa158a2…`, 7 values) and **Ideology** (`bdb20cbb…`, 29 values). No claim had it on 2026-10-22.
- **Claims** use the type `96f859ef…`. A claim carries its text (Name), Topics, Tags, Sources, Supports/Opposes links and sometimes an `Is factual` flag.
- **Paging:** `offset` is capped at 1000, so full scans page with cursors. QA sampling uses random-ID pivots (`id > <random>` ordered by `ID_ASC`).
- **Schema drift:** the exported `GEO_API_SCHEMA.json` is out of date (proposal fields moved into `proposalVersions`). `npm run cli -- schema` pulls the live schema into `schema/`.

## Classification rules

1. **Label the position the claim itself takes, not its topic.** A neutral report of facts, polls or what someone said gets no label.
2. **Limits:** at most one Political leaning and at most two Ideologies.
3. **When unsure, leave it blank.** A wrong bias label on a public graph does more harm than a missing one.
4. **Allowed values are loaded live from Geo** on every run. The answer schema only accepts those names, and code maps names to IDs.
5. **Answer fields:** `political_leaning`, `ideologies`, `confidence`, `evidence`, `rationale`, `abstain_reason`.

## Phases

| # | Phase | Done when |
|---|---|---|
| 0 | Project scaffold | Repo, config, docs |
| 1 | Geo read layer + live taxonomy | Claims with context fetched from all 7 spaces |
| 2 | Classifier + dev-set eval | Models compared on hand-labelled edge cases |
| 3 | QA sample → spreadsheet | 70 claims ready for reviewers |
| 4 | Review loop | Reviewer verdicts meet the agreed accuracy bar |
| 5 | Full run (OpenAI Batch API) | All claims classified into local run state |
| 6 | Local dry run for Geo | Per-space operation files and a readable list, ready for manual proposals |
| 7 | Ongoing | Scheduled labelling of new claims |

## QA sample findings (Phase 3, seed 1)

Share of random claims the agent labelled (gpt-5.5, prompt v1):

| Space | Classified | Labelled |
|---|---|---|
| US Politics | 119 | 3 (2.5%) |
| Health | 120 | 0 |
| Crypto | 120 | 1 (0.8%) |
| AI | 120 | 0 |
| World affairs | 120 | 6 (5%) |
| Podcasts | 120 | 1 (0.8%) |
| Relationships | 60 | 7 (12%) |

- **Most claims are reports, not positions.** Of about 820 pool claims, 632 were left blank as factual reports and 124 as apolitical.
- **QA sample makeup:** the 70 rows are 17 labelled and 53 blank, so the review mostly tests whether blanks are right.
- **Phase 5 cost:** most of the spend will go to confirming blanks. A cheap pre-filter that only removes obvious reports is worth measuring before the full run.
  - A pre-filter mistake means a missed label, not a wrong one.
  - The final label always comes from gpt-5.5.

## QA review, round 1 (Claude AI pre-review of prompt v1)

Full report: `qa/v1-seed1/claude-review-report.md`. A human review of `qa/v1-seed1/qa_sample.xlsx` is still pending.

| Measure | Result | Bar |
|---|---|---|
| Agent labels marked Correct | 10/17 (59%); 13/17 (76%) counting partly correct | 90%: **fail** |
| Agent blanks marked Correct | 53/53 (100%) | 85%: pass |

The agent never missed a label and never picked the wrong side. Its mistakes were labels that went too far:
- **Ideology-only labels** (no political leaning): 2/5 correct. Globalist, Nationalist and Classical liberal were attached to a narrow investment view, an official territorial position and a textbook legal principle.
  - Labels that included a leaning: 8/12 correct, 11/12 counting partly correct.
- **Inferred stances:** "unacceptable risk" was read as support for regulation.
- **Overstated leaning:** "Right" on hedged, descriptive claims about gender roles, where Traditionalist alone fits.

Planned prompt v2 changes:
1. An ideology without a leaning only when the claim advances the tradition's core program, not when it shares one value (free speech, openness, territorial integrity, rule of law).
2. Never infer a stance the claim does not state.
3. Widely shared principles and official state positions in territorial disputes stay blank.
4. Hedged or descriptive claims ("can", "may") get at most a Center left / Center right leaning.

v2 will be measured on the dev set and a fresh QA sample (a new seed), not on these 70 rows.

## Prompt v2 (dev set)

The four changes above, plus a new blank reason, `consensus`. The dev set grew to 53 claims, adding 12 from QA round 1.
- **Result:** v2 passes 53/53.
- **Not over-cautious:** it still labels 24 of the 29 claims that may be labelled.
- **Unchanged clear labels:** every clear label from v1 stays the same.
- **Ideology-only labels kept where right:** Libertarianism (drug legalization), Isolationist (stop policing the world), Globalist (protect the ICC).
- **Hedged claims softened:** hedged gender-role claims now get Traditionalist only.

## QA review, round 2 (Claude AI pre-review of prompt v2, fresh sample)

Sample: `qa/v2-seed2/`, seed 2. It contains no dev-set or round-1 claims. Full report: `qa/v2-seed2/claude-review-report.md`.

| Measure | v1 (round 1) | v2 (round 2) | Bar |
|---|---|---|---|
| Agent labels marked Correct | 10/17 (59%) | **15/18 (83%)** | 90% |
| Agent blanks marked Correct | 53/53 (100%) | 52/52 (100%) | 85% |
| All rows marked Correct | 63/70 (90%) | 67/70 (96%) | |

- **Fixed:** ideology-only labels are no longer a problem; the only one in round 2 was correct.
- **Remaining errors (3):** all three are medium-confidence leanings with no ideology, on claims whose left-right placement is unclear:
  - a coalition between a center-left and a far-right party in Romania;
  - a contrarian case for legalizing insider trading;
  - a psychological claim about masculine norms.
- **By confidence:** high-confidence labels were 2/2 correct; medium were 13/16.
- **Noise:** with 18 labels, one more correct row would move the score to 89%. Four rows marked Correct were close calls (noted in the review file), so a human review could move the score either way.
- **Labelled share of the random pool:** 19 of 832 claims (2.3%). Relationships was highest (7/115), AI lowest (0/120).

## Publishing gate (Phase 6)

The team requires **100% accuracy for anything published**. Model output alone cannot guarantee that, so a label reaches a proposal only after it passes every check below. Anything uncertain is left out.

1. The claim is in the space and has no Leanings yet. Claims are re-fetched from Geo when the proposal is written.
2. The agent's confidence is **high**. In QA, every error was medium confidence.
3. An **independent verifier** agrees with every part of the label.
   - It is a separate gpt-5.5 call at high reasoning effort.
   - It sees the claim but not the agent's reasoning.
4. **Manual review.** Any value that is doubtful drops the claim.
   - This applies especially to ideologies inferred from the topic rather than stated by the claim.
   - `--only` then pins the batch to exactly the approved claims.
5. **Final sign-off** by the person submitting the proposal.

### US Politics, batch 01

- **Candidates:** 80 opinion claims ("... should ...").
- **Automatic checks:** 19 passed. The verifier rejected 2 for ideology tags the claims did not support.
- **Manual review:** 5 more dropped.
  - Progressive for abolishing private schools.
  - Christian conservative and Feminist on abortion claims, where the ideology came from the topic.
  - Newborn investment accounts, which now have support on both sides ("baby bonds" from Democrats, "Trump Accounts" from Republicans).
- **Result:** 10 claims and 12 Leanings links in `proposals/us-politics/batch-01/`.
- **Balance:** 7 left-side and 3 right-side labels, because few right-leaning opinion claims passed. A later batch should draw more candidates to even this out.

### US Politics, batch 02: first submitted proposal

- **Claim:** "Workers should be entitled to company board seats".
- **Leanings:** Left and Social democrat (2 links).
- **Submitted:** 2026-10-22 with `submit --yes`, at the team's request.
  - Proposal `0xa1dab3476831498b9fc2e1183436f5a0`.
  - Transaction `0xa66d7197…783c107e`, succeeded in block 97962.
  - Edit `ipfs://QmRr3QUeMCZqPhXFehAHZAvTjrGVRJMpVmEKZA8DgJUFCh`.
- **Next step:** the wallet's space is a member of US Politics, not an editor, so an editor must vote yes before the links appear.

## Direction after Armando's feedback (2026-10-22)

- **Geo submissions are paused.** Batch 02 was rejected.
- **The focus is now a transparent scoring system**, tested with Armando through Notion. Every result gives:
  - a leaning or ideology with a Clear or Potential qualifier;
  - the reasoning, built from numbered criteria;
  - quoted evidence;
  - a confidence score.

  The agent answers "Uncertain" when the evidence is thin or mixed, and "No political position" when a claim takes none.
- **Framework v1** is in `src/framework/` and `docs/FRAMEWORK.md`:
  - the four position checks;
  - five topic areas with criteria from −3 to +3;
  - the combining rules;
  - 28 draft ideology cards;
  - the confidence formula.
- **The confidence formula uses OpenAI's Decisions API** (`gpt-6-luna`, `POST /v1/decisions`) as an independent signal. It gives probabilities for whether the claim takes a position, for each of the 7 leanings and for each ideology. gpt-5.5 still produces the criteria, evidence and reasoning.
- **Phases:**
  - 7: framework v1.
  - 8: agent v3 implementing it.
  - 9: a test set of about 100 claims, with Armando approving the expected answers in Notion.
  - 10: a run with metrics in Notion.
  - 11: review and tuning with Armando.

## Proposal format

For each label, one operation: `createRelation(from: claim, to: value, type: Leanings)`, grouped per space. Proposals in US Politics recently used FAST voting with a 24-hour window and executed on one "yes" vote.
