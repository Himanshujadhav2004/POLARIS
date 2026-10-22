# QA report: gpt-5.5-2026-04-23, prompt v2

Source: `qa/v2-seed2/claude-review.xlsx`, reviewed by Claude (AI).

## Result

| Measure | Result | Bar | Pass |
|---|---|---|---|
| Agent labels marked Correct | 15/18 (83%) | 90% | No |
| Agent blanks marked Correct | 52/52 (100%) | 85% | Yes |
| All rows marked Correct | 67/70 (96%) | | |

Labels: 15 correct, 0 partly correct, 0 wrong, 3 should be blank.
Counting partly correct as right: 15/18 (83%).
Blanks: 52 correct, 0 missed a label.
0 of 70 rows have no verdict yet.

## By space

| Space | Labels correct | Blanks correct |
|---|---|---|
| us-politics | 4/4 (100%) | 6/6 (100%) |
| health | 1/1 (100%) | 9/9 (100%) |
| crypto | 3/3 (100%) | 7/7 (100%) |
| ai | - | 10/10 (100%) |
| world-affairs | 1/2 (50%) | 8/8 (100%) |
| podcasts | 1/2 (50%) | 8/8 (100%) |
| relationships | 5/6 (83%) | 4/4 (100%) |

## Rows not marked Correct

- **Should be blank** [world-affairs] A coalition between Romania's Social Democrats and the far-right AUR is justified
  - Agent: Right | Reviewer: None
  - Note: The coalition spans a center-left and a far-right party; endorsing it has no clear left-right home.
- **Should be blank** [podcasts] Legalizing insider trading would provide the public with real-time information on the actions of government officials.
  - Agent: Center right | Reviewer: None
  - Note: Unusual argument with no mainstream left-right home; Center right is a guess. Libertarianism would be the closest fit if anything.
- **Should be blank** [relationships] The pressure to appear self-reliant makes men less resilient
  - Agent: Center left | Reviewer: None
  - Note: A psychological claim about a social norm; the left-right reading is inferred.
