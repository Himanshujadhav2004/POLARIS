# QA report: gpt-5.5-2026-04-23, prompt v1

Source: `qa/reviews/claude-review.xlsx`, reviewed by Claude (AI).

## Result

| Measure | Result | Bar | Pass |
|---|---|---|---|
| Agent labels marked Correct | 10/17 (59%) | 90% | No |
| Agent blanks marked Correct | 53/53 (100%) | 85% | Yes |
| All rows marked Correct | 63/70 (90%) | | |

Labels: 10 correct, 3 partly correct, 0 wrong, 4 should be blank.
Counting partly correct as right: 13/17 (76%).
Blanks: 53 correct, 0 missed a label.
0 of 70 rows have no verdict yet.

## By space

| Space | Labels correct | Blanks correct |
|---|---|---|
| us-politics | 2/3 (67%) | 7/7 (100%) |
| health | - | 10/10 (100%) |
| crypto | 0/1 (0%) | 9/9 (100%) |
| ai | - | 10/10 (100%) |
| world-affairs | 4/6 (67%) | 4/4 (100%) |
| podcasts | 0/1 (0%) | 9/9 (100%) |
| relationships | 4/6 (67%) | 4/4 (100%) |

## Rows not marked Correct

- **Partly correct** [us-politics] Universities remaining politically neutral and respecting both sides of an issue can uphold freedom of speech
  - Agent: Center, Classical liberal | Reviewer: None, Classical liberal
  - Note: Backing neutrality is not a Center position; this free-speech argument is made from across the spectrum. Classical liberal fits.
- **Should be blank** [crypto] Robinhood's 10x leveraged crypto perpetuals pose unacceptable financial risks to retail investors
  - Agent: Center left | Reviewer: None
  - Note: Judges a product's risk. Support for regulation is inferred by the agent, not stated in the claim.
- **Should be blank** [world-affairs] The U.S.-DRC partnership should remain open to investors from countries outside the United States
  - Agent: Globalist | Reviewer: None
  - Note: Keeping one partnership open to foreign investors is a narrow policy view, not the Globalist tradition.
- **Should be blank** [world-affairs] Jammu and Kashmir is an integral and inalienable part of India
  - Agent: Nationalist | Reviewer: None
  - Note: Official state position in a territorial dispute, held across India's spectrum; labelling it takes a side in the dispute.
- **Should be blank** [podcasts] The principle that no one should be a judge in their own cause is a fundamental justification for the separation of powers.
  - Agent: Classical liberal | Reviewer: None
  - Note: Explains a widely shared legal principle; not a contested political stance.
- **Partly correct** [relationships] Without pre-made scripts from gender roles, people may be unable to effectively negotiate their roles in new relationships, especially when young
  - Agent: Right, Traditionalist, Conservative | Reviewer: None, Traditionalist
  - Note: Hedged, descriptive claim ("may be unable"). Traditionalist fits, but Right overstates it.
- **Partly correct** [relationships] Adopting traditional gender roles can eliminate the need for a couple to negotiate their respective roles from scratch
  - Agent: Right, Traditionalist, Conservative | Reviewer: None, Traditionalist
  - Note: Describes a practical benefit of traditional roles. Traditionalist fits, but Right overstates it.
