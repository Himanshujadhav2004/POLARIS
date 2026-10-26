# Political leaning and ideology scoring framework (framework-v3.6.1)

Every classification cites the numbered criteria below. The model finds evidence and matches criteria; code turns the matches into the result and decides whether it is published, so the same matches always give the same result.

## Definitions

- **Political leaning**: Describes the preferred ideas, values, and tendencies regarding how power, authority, and resources should be managed in society.
- **Ideology**: A worldview about how society, the economy and government should be organized, named after its followers, such as libertarian or socialist.
- **Leanings** (the property the agent fills): The political positions and ideological traditions an entity identifies with or is associated with, such as center left or libertarian. Unlike Declared bias, it can hold both a place on the spectrum and a worldview. A claim has at most one political leaning but can have several ideological leanings.

Possible results: a **published** leaning (one of Geo's seven) and published ideologies; **No label**, naming the rule that blocked it; or **No political position**, naming the check that failed. There are no partial labels: anything not published is left blank.

## What each level means

The scorer, the independent check and the verifier all use these rules, so they place claims on the same scale.

- Far left (-3): Radical: replaces capitalism or seeks systemic, often revolutionary change; abolishes core institutions such as police, prisons or borders.
- Left (-2): The mainstream liberal or progressive position (in the US, what liberals and Democrats typically support), for example higher taxes on the wealthy, protecting abortion access, a path to citizenship, gun-safety laws or climate action, including bold plans such as single-payer healthcare.
- Center left (-1): A moderate, lean-left position with explicit centrist limits: a step in a liberal direction that the claim itself keeps narrow (targeted, means-tested, or keeping the existing system in place).
- Center (0): Explicitly combines or balances a left and a right position as a compromise, with no consistent tilt.
- Center right (+1): A moderate, lean-right position with explicit centrist limits: a step in a conservative direction that the claim itself keeps narrow (targeted, with exceptions, or keeping the existing system in place).
- Right (+2): The mainstream conservative position (in the US, what conservatives and Republicans typically support), for example lower taxes, stricter immigration enforcement and deportation, abortion restrictions, gun rights or voter ID, including bold plans such as abolishing a federal department.
- Far right (+3): Ultranationalist, nativist or hostile to pluralist institutions: removes rights from people because of ethnicity, religion or sexuality, imposes religious rule, or ends elections or civil liberties for opponents.

## Step 1: does the claim take a political position?

All four checks must pass. If one fails, the result is *No political position*, naming the reason.

| Check | Passes when | Fails when | Reason given |
|---|---|---|---|
| **G1** Takes a position | The claim argues for or against something: "should", "must", "ought", "is justified", "is wrong", or a judgement about a policy or group. | Neutral descriptions, statistics, predictions, definitions and histories; questions; effects outside rule E2. | descriptive |
| **G2** In its own voice | The position belongs to the claim itself. | The position is attributed: "X said", "X argued", "according to", "a study found", "group Y believes". | attributed |
| **G3** Political subject | It concerns public policy, law, rights, government, the economy or how society should be organized. | Personal or relationship advice, business strategy, product judgements, technical, medical or scientific claims, including claims about what a technology, product, substance or medicine does (rule E2). | not political |
| **G4** Contested | Mainstream political camps disagree about it. | Principles shared across the mainstream (rule of law, democracy, free expression in general), a country's official position in a territorial or sovereignty dispute, or a goal stated without a means ("reduce poverty"). | consensus |

## Step 2: score each topic area the claim addresses

Scores run from −3 (Far left) to +3 (Far right). Each score names the Geo leaning it corresponds to.

### ECO: Economy, taxes and work

Covers: Taxes, public spending, welfare and public services, labour and unions, markets and regulation, housing, healthcare and education funding.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **ECO-3L** | -3 Far left | Replace or abolish market capitalism: nationalize the economy, abolish private ownership of major industries, cap income or wealth by law, expropriate, or overthrow capitalism. | "There should be a maximum legal income"; "All major industries should be nationalized" |
| **ECO-2L** | -2 Left | The mainstream liberal or progressive economic position: higher taxes on high earners or corporations, a wealth tax, expanding public programs and the safety net, raising the minimum wage, universal or single-payer healthcare, tuition-free college, student debt relief, stronger unions, consumer and financial regulation. | "The minimum wage should be raised"; "Congress should raise taxes on high earners"; "Public colleges should be tuition-free" |
| **ECO-1L** | -1 Center left | A moderate, lean-left economic step with explicit centrist limits: targeted or means-tested help, modest expansions of existing programs, fixing rather than replacing a program, market-friendly regulation. | "The Affordable Care Act should be improved rather than replaced"; "The child tax credit should be expanded for low-income working families only" |
| **ECO-0** | 0 Center | Explicitly argues for a balance or compromise between market and state, rejecting both expansion and reduction as such. | "The debate should focus on the right balance of financial rules, not eliminating them entirely" |
| **ECO-1R** | +1 Center right | A moderate, lean-right economic step with explicit centrist limits: modest or targeted tax relief, spending restraint that protects core programs, targeted deregulation, market reforms within existing programs. | "The Affordable Care Act should let insurers sell cheaper basic plans"; "Small businesses should get targeted tax relief" |
| **ECO-2R** | +2 Right | The mainstream conservative economic position: lower taxes, spending and deficit cuts, deregulation, school choice, limits on union power, work requirements for welfare, opposition to minimum-wage increases, including bold plans such as abolishing federal departments or agencies, a flat tax, or privatizing Social Security. | "Taxes should be cut"; "Rent control reduces the supply of housing"; "The Department of Education should be abolished" |

### SOC: Social and cultural values

Covers: Abortion, LGBTQ rights, gender roles and family, religion in public life, race and identity, drugs and personal morality, school curricula.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **SOC-3L** | -3 Far left | Abolish core social institutions such as marriage or the family, or suppress religion in private life. | "Marriage should be abolished as a legal institution" |
| **SOC-2L** | -2 Left | The mainstream liberal or progressive social position: protect or expand abortion access, LGBTQ and transgender rights, same-sex marriage, anti-discrimination and DEI measures, secular public institutions, legal marijuana, including bold plans such as decriminalizing all drugs or reparations. | "Abortion access should be protected in federal law"; "Transgender people should be protected from discrimination at work"; "Religious schools should not receive public money" |
| **SOC-1L** | -1 Center left | A moderate, lean-left social position with explicit centrist limits, for example abortion legal up to viability, or decriminalizing marijuana without legalizing it. | "Abortion should be legal up to fetal viability" |
| **SOC-0** | 0 Center | Explicitly argues for a compromise between socially liberal and socially conservative positions. | "Abortion should be legal early in pregnancy and restricted later" |
| **SOC-1R** | +1 Center right | A moderate, lean-right social position with explicit centrist limits, for example limits on late-term abortion with broad exceptions, or religious accommodations that keep anti-discrimination law. | "Late-term abortion should be restricted, with exceptions for the health of the mother and fetal anomalies" |
| **SOC-2R** | +2 Right | The mainstream conservative social position: abortion restrictions or bans, traditional marriage and family, parental rights in education, limits on gender-transition care for minors, religious-liberty exemptions, opposition to DEI, including bold plans such as ending no-fault divorce. | "Abortion should be banned after six weeks of pregnancy"; "Gender-affirming care for minors should be banned" |
| **SOC-3R** | +3 Far right | Remove civil rights from people because of race, religion or sexuality, criminalize homosexuality, or impose religious rule. | "Homosexuality should be criminalized" |

### NAT: Immigration, citizenship and national identity

Covers: Immigration levels and enforcement, refugees and asylum, citizenship, national identity and belonging.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **NAT-3L** | -3 Far left | Abolish national borders or all immigration control. | "National borders should be abolished" |
| **NAT-2L** | -2 Left | The mainstream liberal or progressive immigration position: a path to citizenship, protection for refugees and asylum seekers, limits on enforcement, immigration as a benefit, including bold plans such as abolishing ICE. | "Undocumented immigrants should have a path to citizenship"; "ICE should be abolished" |
| **NAT-1L** | -1 Center left | A moderate, lean-left immigration step with explicit centrist limits, for example legal status for a narrow group, or due process alongside border control. | "Dreamers brought to the US as children should be allowed to stay" |
| **NAT-0** | 0 Center | Explicitly pairs stronger enforcement with legal pathways as a compromise. | "Congress should fund more immigration judges and expand legal work visas" |
| **NAT-1R** | +1 Center right | A moderate, lean-right immigration step with explicit centrist limits, for example more border agents alongside legal immigration, or deporting only people convicted of serious crimes. | "Only immigrants convicted of violent crimes should be deported" |
| **NAT-2R** | +2 Right | The mainstream conservative immigration position: stronger border enforcement, deporting people in the country illegally, lower immigration, ending sanctuary policies, including bold plans such as mass deportation or an immigration moratorium. | "All illegal aliens should be deported"; "Employers should be required to verify workers' immigration status" |
| **NAT-3R** | +3 Far right | Exclude or remove people because of ethnicity or religion, or strip citizenship from groups. | "Muslims should be barred from entering the country" |

### LAW: Law, justice, guns and elections

Covers: Policing, courts and sentencing, guns, the death penalty, voting rules and electoral institutions.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **LAW-3L** | -3 Far left | Abolish the police or prisons. | "Police departments should be abolished" |
| **LAW-2L** | -2 Left | The mainstream liberal or progressive position: gun-safety laws (universal background checks, assault-weapon bans), police accountability, criminal-justice reform, ending cash bail, abolishing the death penalty, wider voting access, abolishing the Electoral College, including bold plans such as mandatory gun buybacks. | "Assault-style rifles should be banned"; "Cash bail should be ended" |
| **LAW-1L** | -1 Center left | A moderate, lean-left step with explicit centrist limits, for example a narrow gun measure such as red-flag laws while protecting gun ownership, or police reform paired with funding. | "Red-flag laws should let courts remove guns from people in crisis, without other new gun restrictions" |
| **LAW-0** | 0 Center | Explicitly balances public safety and civil liberties as a compromise. | "Police should get more funding and stronger accountability rules" |
| **LAW-1R** | +1 Center right | A moderate, lean-right step with explicit centrist limits, for example voter ID with free IDs provided, or tougher sentences for one specific kind of violent crime. | "States should require voter ID while letting voters without one sign a sworn affidavit" |
| **LAW-2R** | +2 Right | The mainstream conservative position: gun rights, tougher sentencing, more police funding, the death penalty, voter ID and election-security rules, limits on mail-in voting, including bold plans such as repealing most gun laws. | "Concealed-carry permits should be valid in every state"; "Mail-in voting should be abolished" |
| **LAW-3R** | +3 Far right | Suspend elections or civil liberties for opponents, rule by decree, or endorse political violence. | "The president should be able to suspend elections during a crisis" |

### ENV: Environment and energy

Covers: Climate policy, pollution, conservation, fossil fuels and renewable energy.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **ENV-3L** | -3 Far left | Abandon economic growth or the market economy to protect the climate. | "Economic growth should be abandoned to save the climate" |
| **ENV-2L** | -2 Left | The mainstream liberal or progressive climate position: climate regulation, emission limits, carbon pricing, clean-energy subsidies, rejoining climate agreements, conservation, including bold plans such as banning new fossil-fuel projects. | "Power plants should face strict limits on carbon emissions"; "All new oil and gas drilling should be banned" |
| **ENV-1L** | -1 Center left | A moderate, lean-left step with explicit centrist limits, for example clean-energy incentives without mandates. | "Clean energy should get tax incentives, but no fossil fuel should be banned" |
| **ENV-0** | 0 Center | Explicitly supports an all-of-the-above energy compromise. | "The US should expand both renewables and natural gas" |
| **ENV-1R** | +1 Center right | A moderate, lean-right step with explicit centrist limits, for example faster permitting for every kind of energy, or market-based conservation. | "Permitting should be faster for both pipelines and wind farms" |
| **ENV-2R** | +2 Right | The mainstream conservative energy position: expand domestic oil and gas, cut climate regulations, leave climate agreements, put energy costs ahead of climate rules, including bold plans such as abolishing the EPA. | "The US should drill for more oil and gas"; "The EPA should be abolished" |

### Cross-cutting topics (recorded, never scored)

- **X-FOR** Foreign policy, war and alliances: Interventionism and restraint are both found on the left and the right.
- **X-TRADE** Trade and tariffs: Protectionism is held by the populist left and the populist right.
- **X-TECH** Technology, AI, privacy and surveillance: Regulation and civil-liberties concerns come from both sides.
- **X-SPEECH** Free expression and content moderation in general: Scored only when the claim ties it to a partisan position in another topic area.
- **X-INST** Government structure and procedure: Federalism, courts and agencies, unless tied to a partisan goal in another topic area.

## Step 3: combining rules

- **C1 Country context.** The criteria list positions in United States politics, so a political leaning is given only for claims about the United States (rule P3). A claim about another country, a region or the whole world gets no political leaning, though its ideological leanings are still checked. If the claim does not make its country clear, no leaning is given.
- **E1 Evidence.** Every criterion and ideology must quote the exact words from the claim that match it. Context (topics, tags, sources, related claims) can help read the claim but is never evidence.
- **E2 Arguing through effects.** A claim takes a side when, in its own voice, it states a general effect of a public policy, law or government program, and that effect is the argument one side makes for or against it ("Raising the minimum wage kills jobs" argues against raising it). This does not apply to effects of a technology, product, substance, medicine, asset or behaviour (vaccines, social media, Bitcoin, AI) unless the claim also says what government or law should do; to dated or measured results, study findings and forecasts, which stay descriptive; to a hedged concession that an effect may happen ("Raising the minimum wage may cost some jobs"); or to a claim that only denies the other side's effect.
- **H1 Hedged wording.** If the claim is hedged or descriptive ("can", "may", "might", "tends to", "often", "in some cases"), every topic-area score is capped at Center left or Center right (±1).
- **A1 Mixed signals.** If one topic area scores left (−1 or lower) and another scores right (+1 or higher), no leaning is given (mixed signals), never Center.
- **A2 Combining topic areas.** When all scored topic areas point the same way, the leaning is their average, rounded toward the center.
- **A3 Center.** Center is given only when a Center criterion (…-0) matches. A claim with no scored topic area gets no leaning (cross-cutting).
- **A4 Far left and far right.** Far left or Far right is given only when a −3 or +3 criterion matches.
- **A5 Between two levels.** If the claim's position sits between two levels, match no criterion for that topic area; matching one topic area at two levels gives no leaning. These positions sit on a boundary and match no criterion: reversing same-sex marriage, ending birthright citizenship, ending all deportations, defunding the police, using the military for domestic policing, and the sentence of one named person or case. A missing label is always acceptable; a wrong one is not.

## Step 4: ideological leanings

Two kinds, both of Geo type Ideology: **issue leanings** (one side of an issue, such as Pro-life) and **traditions** (classic ideologies, such as Conservative). A claim can have several.

- **I1.** Issue leanings: assign one when the claim itself takes that side of its issue, directly or through an effect that side argues (rule E2), quoting the claim's words. The claim must meet the side's own description (rule I7). Taking another side, only mentioning the issue, reporting someone else's side or a hedged concession never counts, and two opposite sides of one issue are never both assigned.
- **I2.** Traditions (Armando's convention): assign one only when the position the claim takes is distinctive of the tradition: its adherents typically hold it, and it is not simply the mainstream left or right position, which the political leaning already records. A mainstream Left or Right policy position alone never makes a claim Liberal, Progressive or Conservative (in Armando's table Left is also called "Liberal (US usage)" and Right "Conservative (US usage)"). The topic alone never counts, and the card's exclusions apply. A position argued through its effects counts (rule E2).
- **I3.** An ideological leaning is published only when all of these hold: its evidence is quoted word for word; the independent probability that the claim takes a position is at least 0.8; the verifier agrees; and all 3 runs find it. For an issue leaning, its independent probability is at least 0.9 and every other side of the issue is at most 0.1; a side the independent check refused to score cannot be ruled out, so it blocks. For a tradition: its independent probability is at least 0.8 when an issue leaning or the political leaning is also published, otherwise at least 0.9; the claim is not hedged; no issue side on the claim is in doubt (another side of its issue scoring above 0.1 or refused, or the verifier rejecting the side); and the tradition is usually found at the claim's leaning, or when it has none at the independent check's most likely leaning if that is at least 0.7. Otherwise it is not published, and the reason is recorded.
- **I4.** A claim has at most one political leaning (Geo's Political position) and at most one tradition (Geo's Ideological leaning), and can have several issue leanings (Geo's Issue positions), up to 5 ideological leanings in all. When more than one tradition passes every rule, only the one with the highest independent probability is published.
- **I5.** When the independent check gives an issue leaning a probability of at least 0.8 that the scorer did not propose, the scorer takes a second look at that card. The leaning is added only if it then quotes the claim's words, and it still passes every other rule. Traditions are never added by a second look.
- **I6.** Specific before general: when an issue that names the claim's topic covers its position (for example Guns, AI, Crypto, Climate, Energy, Minimum wage, Healthcare, Student debt, Foreign aid, Ukraine, Israel–Palestine, Taiwan, China, Iran or Housing), the general side of Regulation, Spending & deficit, Welfare or Use of force is not also assigned. Regulation covers rules on businesses and markets, not on individuals, candidates or officials.
- **I7.** Alternative names are names people use for a side. They never widen its description: a claim belongs to a side only if it meets the description itself, and sharing words with a name is not enough.

## Step 5: publish or leave blank

A leaning is published only when every rule below passes. If any fails, the claim gets no label and the failed rules are recorded.

| Rule | Passes when |
|---|---|
| **P1** Takes a position | All four position checks pass, and the independent probability that the claim takes a position is at least 0.8. |
| **P2** Full match | Every criterion behind the leaning matches directly or closely, not only in part, and the claim is not hedged. |
| **P3** United States | The claim is about the politics of the United States, whose positions the criteria list (rule C1). |
| **P4** Same level | The independent check's most likely leaning is the same exact level, with a probability of at least 0.7. |
| **P5** Verifier agrees | The independent verifier agrees with the leaning. |
| **P6** Stable | The scorer gives the same leaning in all 3 runs, each one also passing P2 and P3. The extra runs are made only when P1–P5 pass. |

Explanations quote the claim only through words checked to be in it, word for word. Notes written by the models are kept apart as unverified reviewer notes.

## Political leanings

From Armando's Political leanings table. A claim gets at most one, and never Nonpartisan.

| Value | Scale | Description | Also called |
|---|---|---|---|
| **Far left** | 1 | A position at the left extreme of the political spectrum, favoring radical economic redistribution and systemic change, often through anti-capitalist or revolutionary politics. | Radical left; Hard left; Extreme left |
| **Left** | 2 | A position on the left of the political spectrum, favoring social equality, expanded government programs and progressive social policy. | Left-wing; Leftist; Liberal (US usage) |
| **Center left** | 3 | A moderate position left of center, supporting liberal social and economic policies while staying close to the political mainstream. | Centre-left; Lean left; Moderate left |
| **Center** | 4 | A position near the middle of the political spectrum, balancing left and right perspectives without a consistent ideological tilt. | Centrist; Moderate; Middle of the road |
| **Center right** | 5 | A moderate position right of center, supporting conservative social and economic policies while staying close to the political mainstream. | Centre-right; Lean right; Moderate right |
| **Right** | 6 | A position on the right of the political spectrum, favoring limited government, free markets, traditional values and strong national defense. | Right-wing; Conservative (US usage) |
| **Far right** | 7 | A position at the right extreme of the political spectrum, marked by ultranationalism, nativism and hostility to pluralist institutions. | Radical right; Hard right; Extreme right |
| **Nonpartisan** | off the scale | For entities that claim no side (wire services, fact-checkers, courts). Off the 1-7 scale. | Neutral; Unaffiliated; Independent |

## Issue leanings

One side of a political issue (Armando's "Ideological leanings" table). Values marked *not on Geo yet* are labelled but never put in a Geo proposal. Alternative names never widen a side (rule I7); names that contradict their side or belong to another leaning are left out.

### Big Tech (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Decelerationist** | Informal label for a stance favoring slower technological development or deployment, especially of AI, to address perceived risks. The label has no single standardized policy program. |  |
| **Pro-innovation** | Supports policies or practices that encourage the development and adoption of new ideas, technologies, products, or processes. | Antitrust skeptic; Pro-Silicon Valley; Pro-tech; Pro-consumer welfare standard; Light-touch regulation |
| **Techno-optimist** | Broad outlook expecting technological development to produce substantial benefits for human well-being. It does not by itself imply support for every technology or for removing all regulation. |  |

### Speech online (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-online safety** | Supports measures to reduce harms associated with online services, such as abuse, exploitation, or harmful platform design. Specific approaches to moderation, privacy, and age verification vary. | Pro-platform accountability; Pro-misinformation controls; Pro-trust and safety; Pro-Kids Online Safety Act; Pro-platform regulation |
| **Pro-internet freedom** | Supports freedom of expression, access to information, and participation online, with limits on censorship and unjustified restrictions. | Pro-free speech; Free speech advocate; Pro-First Amendment; Pro-free expression; Free speech maximalist; Censorship critic |

### Regulation (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-deregulation** | Favors reducing or simplifying government rules on businesses and markets. | Deregulationist; Pro-business; Small-government; Deregulator; Pro-regulatory reform; Red-tape cutter |
| **Pro-regulation** | Favors government rules and oversight to address market failures, protect the public, or constrain harmful conduct. | Pro-consumer protection; Pro-oversight; Pro-public protections; Pro-safeguards; Pro-watchdog |

### Supreme Court (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-court reform** | Supports changes to courts' structure, procedures, appointments, or ethics rules. Support for reform does not by itself specify a particular proposal or constitutional interpretation. | Pro-court expansion; Pro-Supreme Court term limits; Court packing (pejorative); Pro-Supreme Court reform; Pro-term limits; Pro-Supreme Court ethics code; Court reformer |
| **Pro-judicial independence** | Supports courts and judges deciding cases impartially, free from improper interference or pressure. Judicial independence can coexist with court reform and accountability. | Pro-judicial restraint; Pro-nine justices; Constitutionalist |

### Policing (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-criminal justice reform** | Supports changes to policing, courts, sentencing, or incarceration intended to improve fairness or outcomes. | Pro-police reform; Pro-decarceration; Pro-bail reform; Pro-police accountability; Smart on crime; Pro-sentencing reform; Pro-reform prosecutor |
| **Pro-law enforcement** | Supports police and other law-enforcement agencies, their capacity, or their role in public safety. | Back the Blue; Tough on crime; Pro-police funding; Law and order; Pro-law and order; Pro-public safety; Pro-qualified immunity; "Back the Blue" |

### Education (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-school choice** | Supports families having options beyond their assigned public school, including other public schools, charter schools, private schools, or homeschooling; funding preferences vary. | Pro-vouchers; Pro-charter schools; Pro-education freedom; Pro-parental choice; Pro-ESA; Pro-universal school choice; Parent empowerment |
| **Pro-public education** | Supports public schools and public investment in education. | Voucher skeptic; Public school advocate; Pro-public school funding; Pro-neighborhood schools; Voucher opponent |

### Use of force (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Dove** | Favors restraint in using military force and prefers diplomacy or limited commitments. | Restrainer; Non-interventionist; Anti-war; Realist; Pro-diplomacy; Pro-military restraint |
| **Hawk** | Favors a more forceful foreign policy and is comparatively willing to use military power. | Interventionist; Internationalist; Primacist; Liberal internationalist; Pro-deterrence |

### Iran (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-Iran containment** | Favors limiting Iran’s regional influence through deterrence, sanctions, or other pressure. | Pro-maximum pressure; Pro-strikes on Iran; Pro-pressure on Iran; Iran deal critic; Pro-sanctions on Iran; Pro-snapback |
| **Pro-Iran diplomacy** | Supports negotiating with Iran and using diplomacy to manage disputes or reduce conflict. | Pro-Iran deal; Iran dove; Pro-JCPOA; Pro-engagement with Iran; Pro-nuclear deal; Pro-diplomacy with Iran; Iran engager |

### Trade (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Free trader** | Favors reducing barriers to international trade and maintaining open trade relationships. |  |
| **Protectionist** | Supports trade barriers or domestic preferences intended to protect local industries and workers from foreign competition. | Pro-tariffs; Economic nationalist; Pro-fair trade; Trade hawk; Tariff hawk; America First trade; Pro-reshoring |

### Welfare (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-welfare expansion** | Supports expanding public benefits or social programs that provide income, health, or other assistance. | Pro-welfare state; Pro-social programs; Pro-safety net; Pro-social insurance; Pro-Medicaid expansion; Pro-SNAP |
| **Pro-welfare reform** | Supports changes to public assistance programs' design, eligibility, administration, or incentives. The label alone does not establish whether benefits would expand or contract. | Pro-work requirements; Welfare skeptic; Workfare; Welfare-to-work; Pro-self-sufficiency; Pro-work |

### Crypto (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Crypto skeptic** | Questions the benefits or safety of cryptocurrencies and favors caution or stronger safeguards. | Crypto critic; Bitcoin skeptic; Pro-investor protection; Crypto regulation advocate; Pro-bank-style crypto rules |
| **Pro-crypto** | Supports cryptocurrencies and policies that enable their use or growth. | Crypto advocate; Pro-digital assets; Pro-Bitcoin; Crypto supporter; Crypto-friendly; Crypto booster; Pro-crypto innovation |

### Minimum wage (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-market wages** | Favors wages being determined primarily through labor-market bargaining rather than statutory wage floors or government-mandated increases. |  |
| **Pro-living wage** | Supports pay sufficient to afford a decent standard of living for workers and their families. This can be pursued through wage-setting policies, collective bargaining, or employer practices. | Pro-$15 minimum wage; Raise the Wage; Fight for $15; Pro-higher minimum wage; Pro-wage floor; "Fight for $15" |

### Taiwan (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-Taiwan defense** | Supports military assistance, deterrence, or defensive commitments intended to protect Taiwan against attack or coercion. This does not by itself imply support for a formal declaration of independence. |  |
| **Pro-Taiwan restraint** | Favors limiting U.S. military commitments or escalation risks concerning Taiwan and prioritizing diplomacy or other nonmilitary approaches. This does not by itself imply support for unification with China. |  |

### Gender identity (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Gender-critical** | Holds that biological sex is distinct from gender identity and should remain a basis for relevant legal and social distinctions. Specific policy positions vary. | Pro-sex-based rights; Pro-sex-based policies; Pro-women's sports; Pro-biological sex; Gender ideology critic; Pro-single-sex spaces; Pro-Protect Women's Sports Act |
| **Pro-transgender rights** | Supports equal legal rights and protections for transgender people. | Pro-trans rights; Pro-gender-affirming care; Pro-trans inclusion; Trans-inclusive; Trans ally; Pro-gender identity protections |

### Alliances (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **NATO skeptic** | Questions NATO’s purpose, costs, expansion, or members’ obligations. | Pro-burden shifting; America First; Alliance skeptic; Burden-shifter; Pro-dormant NATO; Pro-European defense autonomy |
| **Pro-NATO** | Supports the North Atlantic Treaty Organization and its role in collective defense and security cooperation among its members. |  |

### Climate (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Climate skeptic** | Umbrella label for views questioning aspects of climate-change science, projected impacts, or proposed responses. Skepticism about a particular policy does not necessarily imply rejection of human-caused warming. | Climate realist; Climate action skeptic; Climate denier (pejorative); Climate doubter; Lukewarmer; Climate contrarian |
| **Pro-climate action** | Supports public or private measures to reduce climate change or adapt to its effects. | Pro-climate; Climate hawk; Climate advocate; Pro-decarbonization; Pro-net zero; Climate activist |

### LGBTQ (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-LGBTQ rights** | Supports equal legal rights and protections for LGBTQ people. | Pro-same-sex marriage; Pro-gay rights; Pro-marriage equality; Pro-LGBTQ equality; LGBTQ ally; Pro-Equality Act |

### Public health (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-vaccination** | Supports vaccination as a means of preventing disease and protecting health. Support for vaccination does not by itself imply support for vaccine mandates. | Pro-public health measures; Pro-vaccine; Pro-immunization requirements; Pro-school vaccine requirements |
| **Pro-vaccine choice** | Supports individual choice about vaccination and opposes vaccine mandates. | Pro-vaccine exemptions; Pro-health freedom; Mandate skeptic; Pro-medical liberty |

### Drugs (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-legalization** | Supports making specified currently prohibited drugs or related activities lawful under a legal framework. Legalization is distinct from only removing criminal penalties for possession or use. | Pro-decriminalization; Pro-cannabis legalization; Pro-harm reduction; Drug policy reformer; Pro-drug policy reform; Pro-cannabis reform |
| **Prohibitionist** | In this dataset's drug-policy context, supports legal prohibitions on specified drugs or drug-related activities and opposes their legalization. |  |

### Religion (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Church-state separationist** | Supports keeping government institutions and religious institutions legally separate. | Pro-separation of church and state; Separationist; Pro-secular government; Pro-Establishment Clause |
| **Pro-religious freedom** | Supports the right to practice religion and protections for religious belief and exercise. | Pro-faith in public life; Pro-conscience rights; Accommodationist; Pro-religious exemptions; Pro-free exercise |

### Foreign aid (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-foreign aid** | Supports providing assistance to other countries for purposes such as humanitarian relief, development, or security. Support is not limited to one agency or aid program. |  |
| **Pro-foreign aid reform** | Supports changes to foreign assistance programs' objectives, allocation, delivery, or oversight. Reform may involve expansion, reduction, or redirection of particular programs. | Pro-foreign aid cuts; Foreign aid critic; Aid skeptic; Pro-aid reform; Pro-America First aid; Pro-USAID overhaul |

### AI (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-AI acceleration** | Supports faster development and deployment of artificial intelligence. Views on appropriate safety measures and regulation vary. | Accelerationist; e/acc; Pro-AI innovation; AI booster; Pro-light-touch AI; Pro-AI preemption; AI optimist |
| **Pro-AI regulation** | Supports rules or oversight governing the development or use of artificial intelligence. | Pro-AI safety; AI safety advocate; AI doomer (pejorative); Pro-AI guardrails; Pro-AI oversight; AI safetyist; Pro-state AI laws |

### Israel–Palestine (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-Palestinian** | Supports Palestinian rights, interests, or political self-determination. | Pro-Palestine; Palestinian rights advocate; Israel critic; Palestine solidarity; Israel aid skeptic |
| **Pro-Israel** | Supports Israel's security, national interests, or continued existence as a Jewish state. The label does not necessarily imply support for every Israeli government policy. | Israel supporter; Zionist; Israel hawk; Pro-Israel aid; Israel ally; Pro-US-Israel alliance |
| **Anti-Zionist** | Opposes Zionism as a political ideology or movement supporting Jewish national self-determination in Israel. Anti-Zionist positions vary and extend beyond criticism of particular Israeli government policies. |  |

### Housing (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Neighborhood preservation** | Favors protecting the character or stability of existing residential neighborhoods, often through local land-use controls. | Pro-neighborhood character; NIMBY (pejorative); Slow-growth; Neighborhood preservationist; Pro-single-family zoning; Pro-home rule |
| **Pro-housing development** | Supports building more housing or reducing barriers to new residential construction. | YIMBY; Pro-zoning reform; Pro-abundance; Pro-housing; Pro-supply; Pro-density; Pro-building |

### Nuclear (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-nuclear power** | Supports using or expanding nuclear energy to generate electricity. | Pro-nuclear; Nuclear advocate; Nuclear supporter; Pro-nuclear energy; Pro-nuclear expansion; Pro-advanced reactors |
| **Anti-nuclear** | Opposes nuclear power or its expansion. | Nuclear critic; Nuclear opponent; Nuclear power opponent; Nuclear safety advocate; No-nukes |

### Taxes (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Progressive taxation** | Supports tax structures in which higher-income taxpayers pay a larger proportion of their income in tax than lower-income taxpayers. |  |
| **Pro-tax cuts** | Supports reducing tax rates or the amount of tax people or businesses pay. | Tax cutter; Low-tax; Anti-tax; Supply-sider; Taxpayer advocate; Pro-flat tax; "Read my lips: no new taxes" |

### Immigration (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-immigration** | Supports immigration or policies that make immigration and immigrant integration easier. | Pro-immigrant; Pro-amnesty; Open borders (pejorative); Immigrant rights advocate; Immigration advocate; Pro-pathway to citizenship |
| **Pro-border security** | Supports stronger enforcement and security measures at national borders. | Pro-deportation; Immigration restrictionist; Immigration hawk; Border hawk; Low-immigration |

### Ukraine (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-Ukraine** | Supports Ukraine’s sovereignty and its defense against Russia’s invasion. | Pro-Ukraine aid; Ukraine supporter; Ukraine hawk; Russia hawk; Pro-Kyiv; Pro-sanctions on Russia |
| **Ukraine aid skeptic** | Questions the scale, duration, effectiveness, or conditions of assistance to Ukraine and may favor limiting or conditioning it. This stance does not by itself establish support for Russia. |  |

### Social Security (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-entitlement reform** | Supports changes to statutory benefit programs, such as Social Security or Medicare, to alter their financing, eligibility, or benefits. Proposals may expand or reduce particular benefits. | Pro-Social Security reform; Pro-Social Security privatization; Entitlement reformer; Pro-solvency; Pro-personal accounts; Pro-retirement age increase |
| **Benefit preservation** | Supports maintaining existing public benefits or protecting recipients against benefit reductions, including in programs such as Social Security. | Pro-Social Security; Pro-entitlements; Expand Social Security; Pro-Social Security 2100; Pro-benefit increase |

### Student debt (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-repayment** | Favors borrowers repaying student loans and opposes or limits loan cancellation. | Loan forgiveness skeptic; Pro-borrower responsibility; Pro-taxpayer fairness; Debt cancellation critic |
| **Pro-student debt relief** | Supports reducing or cancelling student loan debt for borrowers. | Pro-loan forgiveness; Pro-free college; Pro-debt cancellation; Cancel student debt; Pro-debt relief; Debt abolitionist |

### Spending & deficit (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-public spending** | Supports government spending on public programs, services, or investment. | Pro-government investment; Deficit dove; Keynesian; Pro-public investment; Fiscal dove; Deficit owl; Pro-stimulus |
| **Fiscal hawk** | Favors limiting deficits and public debt through spending discipline, revenue, or both. |  |

### Elections (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-election integrity** | Supports measures intended to ensure elections are accurate, secure, lawful, and fairly administered. Specific measures and their effects on voting access are matters of debate. | Pro-voter ID; Pro-election security; Pro-proof of citizenship; Pro-SAVE Act; Pro-secure elections; Pro-voter roll integrity |
| **Pro-voting rights** | Supports protecting or expanding access to voting and participation in elections. | Pro-ballot access; Pro-mail voting; Pro-voter participation; Pro-automatic voter registration; Pro-John Lewis Act |

### Guns (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-gun control** | Supports laws that restrict or regulate access to firearms. | Pro-gun safety; Pro-gun reform; Gun-control advocate; Gun violence prevention; Pro-gun violence prevention; Pro-gun regulation; Pro-firearm regulation |
| **Pro-gun rights** | Supports legal protections for firearm ownership and use. Views on which restrictions are acceptable vary. | Pro-Second Amendment; Pro-2A; Gun-rights advocate; Pro-gun; Second Amendment supporter; Pro-gun owner; Pro-constitutional carry |

### Federalism (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-states' rights** | Supports state governments’ authority relative to the federal government. | Federalist; Pro-decentralization; Pro-federalism; Pro-Tenth Amendment; Pro-state sovereignty; Tenth Amendment advocate |
| **Pro-federal authority** | Supports federal government authority over states in areas assigned to or best handled by the national government. | Pro-national standards; Pro-federal preemption; Pro-national uniformity; Pro-federal supremacy; Pro-federal oversight |

### Energy (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-fossil fuels** | Supports continued or expanded production and use of fossil fuels, including coal, oil, and natural gas. |  |
| **Pro-clean energy** | Supports energy sources with lower greenhouse-gas emissions, such as renewables or nuclear power. | Pro-green energy; Clean energy advocate; Pro-energy transition; Pro-solar and wind; Pro-clean energy abundance |

### Healthcare (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-universal healthcare** | Supports ensuring that everyone can obtain needed health services without financial hardship. Universal coverage can involve public, private, or mixed systems. | Pro-Medicare for All; Pro-single-payer; Pro-public option; Pro-universal coverage; Medicare for All; Health care as a right; Pro-government health care |
| **Free-market healthcare** | Supports a greater role for market competition, private provision, and consumer choice in healthcare. Specific views on public financing, regulation, and assistance vary. | Pro-private healthcare; Pro-health savings accounts; Obamacare critic; Consumer-driven healthcare; Pro-patient choice; Pro-market competition |

### China (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-China engagement** | Supports diplomacy, trade, or cooperation with China rather than isolating or confronting it. | China dove; Pro-détente; Pro-trade with China; Engager; Pro-engagement; Competitive coexister; Pro-coexistence |
| **Pro-China containment** | Favors limiting China’s power or influence through deterrence, alliances, or other pressure. | Pro-decoupling; China skeptic; New Cold Warrior; Pro-strategic competition; Pro-containment; China critic |

### DEI (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-meritocracy** | Supports allocating opportunities, responsibilities, or rewards according to relevant ability, effort, and achievement. Views on how merit should be measured and unequal starting conditions addressed vary. | Anti-DEI; Pro-merit; Pro-colorblind policy; Pro-MEI; Pro-race-neutral policy; Pro-equal treatment |
| **Pro-equity** | Supports addressing unjust disadvantages and barriers to fair treatment or opportunities. The term's application to resources, procedures, and outcomes varies by context. | Pro-diversity; Pro-affirmative action; Pro-inclusion; DEI supporter; Pro-race-conscious policy; Pro-DEIA |

### Death penalty (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-death penalty** | Supports retaining or applying capital punishment for certain serious crimes. | Pro-capital punishment; Death penalty supporter; Retentionist; Death penalty retentionist; Pro-retention |
| **Death penalty abolitionist** | Supports ending capital punishment. | Anti-death penalty; Pro-abolition of capital punishment; Abolitionist; Pro-abolition; Pro-repeal; Death penalty opponent |

### Privacy (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-surveillance** | Supports using or expanding surveillance powers for purposes such as intelligence gathering, law enforcement, or security. Views on authorization, oversight, and privacy safeguards vary. |  |
| **Pro-privacy** | Supports protecting personal information and limiting unwarranted data collection or surveillance. | Pro-civil liberties; Pro-data protection; Surveillance critic; Privacy hawk; Pro-warrant requirement; Pro-Fourth Amendment; Civil libertarian |

### Abortion (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-life** | Opposes abortion, especially on the grounds that fetal life should receive legal protection. | Anti-abortion (AP style); Pro-abortion restrictions; Pro-personhood; Abortion abolitionist; Pro-unborn |
| **Pro-choice** | Supports legal access to abortion and the right to decide whether to continue a pregnancy. | Abortion-rights (AP style); Pro-abortion rights; Pro-reproductive rights; Pro-reproductive freedom; Pro-bodily autonomy; Reproductive justice; Pro-Roe; "My body, my choice" |

### Labor (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-union** | Supports labor unions and collective bargaining rights for workers. | Pro-labor; Pro-collective bargaining; Pro-worker; Pro-organized labor; Union ally; Pro-PRO Act; Labor-backed |
| **Anti-union** | Opposes labor unions or supports restricting their power, membership, or collective bargaining. | Pro-open shop; Union skeptic; Right-to-work; Pro-voluntary unionism; Pro-worker freedom; Pro-paycheck protection |

### Isolationism (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Isolationist** | Foreign-policy outlook favoring avoidance of foreign wars and binding political or military commitments. It is distinct from simply opposing one intervention and need not mean ending all international trade. |  |

## Traditions

Classic ideologies. A tradition applies when the claim's position is distinctive of it, not simply the mainstream left or right position (rule I2).

### Social conservative (Draft)

Political outlook favoring traditional social institutions and moral norms, especially concerning family, religion, sexuality, and gender.

- **T1** Traditional moral norms on family, sexuality and gender upheld in law or policy, argued as defending those norms.
- **T2** Restrictions that protect traditional social institutions, such as marriage between a man and a woman.
- Not this tradition: A position on abortion alone: that is the Pro-life issue position.
- Not this tradition: A position that touches none of family, sexuality, gender or religion.
- Related: Conservative, Christian conservative, Traditionalist
- Usually found at: Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Classical liberal (Draft)

Political philosophy emphasizing individual liberty, civil liberties, private property, the rule of law, and limits on government power; views on the state's economic role vary.

- **T1** Protect individual rights and civil liberties, including free speech, against state power.
- **T2** Limited, constitutional government under the rule of law.
- **T3** Free markets defended as a matter of individual liberty.
- Not this tradition: A principle shared across the mainstream, such as the rule of law in general (see G4).
- Related: Libertarian, Liberal, Neoliberal, Conservative
- Usually found at: Center left, Center, Center right, Right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Nationalist (Draft)

Political outlook that gives special importance to national identity and self-government and prioritizes the nation's interests. Nationalist traditions differ on citizenship, ethnicity, and international cooperation.

- **T1** Put national identity, sovereignty and interests first, including over international bodies.
- Not this tradition: A state's official position in a territorial or sovereignty dispute (see G4).
- Related: MAGA, Paleoconservative, Populist
- Usually found at: Left, Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Globalist (Draft)

Political outlook favoring international integration and cooperation in economic and foreign affairs. The label has several meanings and is also used pejoratively.

- **T1** International cooperation and global institutions to address shared problems.
- **T2** Open cross-border trade.
- **T3** Migration as a benefit.
- Not this tradition: A narrow bilateral deal or one foreign investment.
- Not this tradition: Never use the label as an insult: it applies only to the claim's own position.
- Related: Neoliberal, Liberal
- Usually found at: Left, Center left, Center, Center right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Secularist (Draft)

Political outlook favoring state neutrality toward religion and belief and limits on religious authority over government. Secularism does not require individuals to be nonreligious.

- **T1** Separate religious institutions from state authority; secular government and law.
- **T2** Freedom of belief for everyone.
- Not this tradition: Defending one group's religious freedom.
- Related: Humanist, Liberal
- Usually found at: Left, Center left, Center, Center right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Conservative (Draft)

Political tradition valuing inherited institutions, customs, and social continuity and generally favoring cautious change. Its policies and understanding of tradition vary across countries and periods.

- **T1** Preserve tradition, established institutions and social continuity; prefer gradual change.
- **T2** Traditional family and social norms.
- Not this tradition: A technical policy with no link to tradition or social norms.
- Not this tradition: A mainstream right policy (tax or spending cuts, deregulation, gun rights, immigration enforcement) with no appeal to tradition, continuity or traditional norms: that is the Right leaning.
- Related: Traditionalist, Christian conservative, Paleoconservative, Neoconservative, Classical liberal
- Usually found at: Center right, Right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Paleoconservative (Draft)

A U.S. conservative current emphasizing national sovereignty, cultural tradition, restrictive immigration, and restraint in foreign intervention.

- **T1** National sovereignty and cultural tradition.
- **T2** Restrictive immigration.
- **T3** Restraint in foreign intervention.
- Not this tradition: A single policy with no link to sovereignty, tradition or restraint.
- Related: MAGA, Traditionalist, Nationalist
- Usually found at: Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### MAGA (Draft)

Political movement and associated nationalist-populist outlook centered on Donald Trump's Make America Great Again slogan, emphasizing America First policies, immigration restrictions, and opposition to political elites.

- **T1** Donald Trump's Make America Great Again agenda and America First nationalism.
- **T2** Restrictive immigration and enforcement under Trump.
- **T3** Opposition to established political institutions.
- Not this tradition: Any position that does not invoke Trump, America First or MAGA (use the issue leaning instead).
- Related: Paleoconservative, Nationalist, Populist
- Usually found at: Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Democratic socialist (Draft)

Socialist outlook combining political democracy with social ownership and democratic control of economic life. It is distinct from policies that solely regulate capitalism or expand welfare.

- **T1** Social ownership or public control of key sectors.
- **T2** Universal public provision replacing private provision, such as single-payer healthcare or free college.
- **T3** Reaching these through elections and democratic institutions.
- Not this tradition: Revolution or one-party rule (see Communist).
- Related: Socialist, Social democrat, Progressive
- Usually found at: Far left, Left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Liberal (Draft)

In contemporary U.S. politics, an outlook supporting civil liberties, equal rights, and government action to address social and economic inequalities. Liberalism has broader and differing meanings internationally.

- **T1** Civil liberties and individual rights defended against state or majority restriction, such as due process or protecting unpopular speech.
- **T2** Social equality pursued through civil rights and equal treatment.
- Not this tradition: The international, free-market sense of the word: in Geo, Liberal means the US center-left outlook.
- Not this tradition: A mainstream left policy (taxes, spending, guns, climate, abortion, unions, student debt) argued without civil-liberties or equal-rights reasoning: that is the Left leaning.
- Related: Progressive, Social democrat, Classical liberal, Neoliberal
- Usually found at: Left, Center left, Center
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Socialist (Draft)

Family of political and economic views favoring social ownership or democratic control of productive resources rather than their predominantly private ownership. Socialist traditions differ on markets, planning, and political strategy.

- **T1** Social, public or worker ownership or control of major productive resources.
- **T2** Caps on income or wealth set by law to reach economic equality (a tax is not a cap).
- Not this tradition: Welfare expansion within a market economy (see Social democrat).
- Related: Democratic socialist, Communist, Marxist, Social democrat
- Usually found at: Far left, Left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Feminist (Draft)

Family of social and political perspectives seeking equality for women and challenging sex- and gender-based subordination. Feminist traditions differ in their explanations of inequality and proposed remedies.

- **T1** Political, economic and social equality for women.
- **T2** Oppose gender-based discrimination.
- Not this tradition: A family or abortion position not argued in terms of women's equality or rights.
- Related: Progressive, Liberal
- Usually found at: Far left, Left, Center left, Center
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Marxist (Draft)

Social and political outlook drawing on Karl Marx's analysis of class relations, historical change, and capitalism, including its critique of exploitation and class domination.

- **T1** Critique of capitalism as exploitation or as doing more harm than good.
- **T2** Analysis of politics through class relations and class struggle.
- Not this tradition: Inequality concerns with no critique of capitalism or class analysis.
- Not this tradition: Criticism of corporations or of "unregulated" capitalism without class analysis.
- Related: Communist, Socialist
- Usually found at: Far left, Left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Neoconservative (Draft)

A conservative outlook associated with an assertive U.S. foreign policy, military strength, and support for promoting democracy abroad.

- **T1** An assertive foreign policy that uses military strength or pressure.
- **T2** Promoting democracy abroad and confronting rivals.
- Not this tradition: Defensive aid or deterrence alone.
- Related: Conservative
- Usually found at: Center right, Right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Communist (Draft)

Political ideology seeking a classless society based on common ownership of productive resources. Communist traditions differ over how to achieve that goal and the role of the state.

- **T1** Collective ownership of productive resources, toward a classless society.
- **T2** Overthrow capitalism, by revolution or one-party rule.
- Not this tradition: Reforms within a market economy, however large.
- Related: Marxist, Socialist, Anarchist
- Usually found at: Far left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Social democrat (Draft)

In its contemporary sense, a political tradition supporting a predominantly market economy alongside democratic government, economic regulation, labor protections, and extensive public services and social welfare.

- **T1** A market economy with strong public services and social welfare.
- **T2** Labor protections, unions and higher wages for workers.
- **T3** Progressive taxation, pursued through democratic reform.
- Not this tradition: Social ownership of industries (see Democratic socialist or Socialist).
- Related: Democratic socialist, Liberal, Progressive
- Usually found at: Left, Center left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Humanist (Draft)

Ethical and philosophical worldview emphasizing human dignity, reason, and human welfare. Broader than a specifically political ideology, humanism includes both religious and nonreligious traditions.

- **T1** Ground ethics and policy in human dignity, reason and human welfare rather than religious authority.
- Not this tradition: General humanitarian concern without that grounding.
- Related: Secularist
- Usually found at: Left, Center left, Center, Center right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Traditionalist (Draft)

An outlook that values inherited customs and institutions and favors preserving social continuity over rapid change.

- **T1** Inherited customs, institutions and traditional values as the foundation of society.
- **T2** Preserve social continuity over rapid change.
- Not this tradition: Nostalgia without a claim about how society should be ordered.
- Related: Conservative, Christian conservative, Paleoconservative
- Usually found at: Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Neoliberal (Draft)

Contested label for political and economic ideas emphasizing markets, private enterprise, and competition, often associated with privatization, deregulation, and trade liberalization; views on welfare and state institutions vary.

- **T1** Market competition and private enterprise as the general engine of growth.
- **T2** Deregulation, privatization, free trade and fiscal restraint as a program.
- Not this tradition: Cutting the rules of one sector or project only.
- Not this tradition: Deregulation argued as individual liberty (see Libertarian).
- Related: Classical liberal, Libertarian, Conservative, Globalist
- Usually found at: Center left, Center, Center right, Right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Populist (Draft)

Political outlook presenting society as divided between the people and a corrupt elite and demanding that politics express the people's will. It can combine with left-wing or right-wing ideologies.

- **T1** Frame politics as ordinary people against a powerful elite, claiming to represent the people.
- Not this tradition: Criticism of a specific official or company without people-versus-elite framing.
- Related: MAGA, Nationalist, Progressive
- Usually found at: Far left, Left, Center left, Center, Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Libertarian (Draft)

Political outlook giving individual liberty priority and opposing coercive interference. In contemporary U.S. usage, it commonly combines strong private-property rights and market freedom with civil liberties.

- **T1** Sharply limited government.
- **T2** Free markets and opposition to economic mandates such as minimum wages.
- **T3** Broad personal freedoms, for example on drugs, guns and speech.
- Not this tradition: Deregulation argued for growth rather than liberty (see Neoliberal).
- Related: Classical liberal, Anarchist, Neoliberal
- Usually found at: Far left, Left, Center left, Center, Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Islamist (Draft)

Family of political outlooks seeking to organize government and public life according to interpretations of Islamic principles. Islamist movements differ substantially and should not be equated with Islam or Muslim identity.

- **T1** Islamic principles or law should shape government and public life.
- Not this tradition: Claims about Muslims' rights, Muslim identity or the religion of Islam itself.
- Related: none
- Usually found at: Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Environmentalist (Draft)

Broad social and political outlook placing protection of the natural environment at the center of public concerns, including conservation, pollution prevention, and ecological sustainability.

- **T1** Protect the natural environment and ecosystems; conservation.
- **T2** Reduce pollution.
- **T3** Urgent action against climate change.
- Not this tradition: An environmental benefit mentioned only in passing.
- Related: Progressive
- Usually found at: Far left, Left, Center left, Center
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Progressive (Draft)

A U.S. political outlook supporting reforms or structural changes to expand social and economic equality, civil rights, and environmental protection.

- **T1** Structural reform argued as reducing inequality between groups or classes.
- **T2** Civil rights and equity, including diversity, equity and inclusion.
- **T3** Environmental protection as part of a wider reform agenda.
- Not this tradition: A small technical adjustment with no equality, civil-rights or environmental aim.
- Not this tradition: One mainstream left policy not argued in terms of equality, equity or structural change: that is the Left leaning.
- Related: Liberal, Democratic socialist, Social democrat, Environmentalist
- Usually found at: Far left, Left, Center left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Christian conservative (Draft)

Conservative political outlook informed by Christian beliefs and moral traditions, often emphasizing religion's public role and traditional views on family, marriage, and abortion.

- **T1** Restrict or ban abortion.
- **T2** Defend traditional marriage and the family as the basis of society.
- **T3** Christian or traditional religious practice in public life and schools, and religious liberty for it.
- Not this tradition: Positions that touch none of abortion, marriage and family, religion or education.
- Not this tradition: Other faiths, or education and parental-rights positions with no religious element.
- Related: Traditionalist, Conservative, Paleoconservative
- Usually found at: Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Anarchist (Draft)

A political outlook opposing the state and other coercive hierarchies and favoring voluntary association and self-governance. Anarchist traditions differ widely on property, markets, and social organization.

- **T1** Abolish the state or replace it with voluntary association and self-governance.
- **T2** Reject coercive hierarchies such as police, prisons or bosses.
- Not this tradition: Calls to shrink or reform government while keeping it.
- Related: Communist, Marxist, Libertarian
- Usually found at: Far left, Left, Right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

