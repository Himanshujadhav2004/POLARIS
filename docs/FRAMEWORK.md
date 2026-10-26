# Political leaning and ideology scoring framework (framework-v3.4.1)

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
- **I3.** An ideological leaning is published only when all of these hold: its evidence is quoted word for word; the independent probability that the claim takes a position is at least 0.8; the verifier agrees in all 2 of its checks; and all 3 runs find it. For an issue leaning, its independent probability is at least 0.9 and every other side of the issue is at most 0.1; a side the independent check refused to score cannot be ruled out, so it blocks. For a tradition: its independent probability is at least 0.8 when an issue leaning or the political leaning is also published, otherwise at least 0.9; the claim is not hedged; no issue side on the claim is in doubt (another side of its issue scoring above 0.1 or refused, or the verifier rejecting the side); and the tradition is usually found at the claim's leaning, or when it has none at the independent check's most likely leaning if that is at least 0.7. Otherwise it is not published, and the reason is recorded.
- **I4.** A claim has at most one political leaning but can have several ideological leanings, up to 5.
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
| **P5** Verifier agrees | The independent verifier agrees with the leaning in all 2 of its separate checks. |
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
| **Deaccelerationist** *(not on Geo yet)* | Advocates slowing the pace or reducing the scale of technological development and deployment. | Big Tech critic; Anti-monopoly; Big Tech skeptic |
| **Pro-innovation** *(not on Geo yet)* | Favors policies that enable technological innovation and growth in the technology sector. | Antitrust skeptic; Pro-Silicon Valley; Pro-tech; Pro-consumer welfare standard; Light-touch regulation |
| **Techno-optimist** *(not on Geo yet)* | Believes technological progress and innovation are broadly beneficial and should generally be encouraged. |  |

### Speech online (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-online safety** *(not on Geo yet)* | Supports measures that reduce online harms, especially for children, while shaping platform rules and content moderation. | Pro-platform accountability; Pro-misinformation controls; Pro-trust and safety; Pro-Kids Online Safety Act; Pro-platform regulation |
| **Pro-internet freedom** *(not on Geo yet)* | Supports broad freedom of expression and access online, with limited government or platform restrictions. | Pro-free speech; Free speech advocate; Pro-First Amendment; Pro-free expression; Free speech maximalist; Censorship critic |

### Regulation (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-deregulation** *(not on Geo yet)* | Favors reducing or simplifying government rules on businesses and markets. | Deregulationist; Pro-business; Small-government; Deregulator; Pro-regulatory reform; Red-tape cutter |
| **Pro-regulation** *(not on Geo yet)* | Favors government rules and oversight to address market failures, protect the public, or constrain harmful conduct. | Pro-consumer protection; Pro-oversight; Pro-public protections; Pro-safeguards; Pro-watchdog |

### Supreme Court (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-court reform** *(not on Geo yet)* | Supports changes to the structure, procedures, or ethics rules of the courts, especially the Supreme Court. | Pro-court expansion; Pro-Supreme Court term limits; Court packing (pejorative); Pro-Supreme Court reform; Pro-term limits; Pro-Supreme Court ethics code; Court reformer |
| **Pro-judicial independence** *(not on Geo yet)* | Supports courts deciding cases independently, without political pressure from elected officials. | Pro-judicial restraint; Pro-nine justices; Constitutionalist |

### Policing (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-criminal justice reform** *(not on Geo yet)* | Supports changes to policing, courts, sentencing, or incarceration intended to improve fairness or outcomes. | Pro-police reform; Pro-decarceration; Pro-bail reform; Pro-police accountability; Smart on crime; Pro-sentencing reform; Pro-reform prosecutor |
| **Pro-law enforcement** *(not on Geo yet)* | Supports police and other law-enforcement agencies, their capacity, or their role in public safety. | Back the Blue; Tough on crime; Pro-police funding; Law and order; Pro-law and order; Pro-public safety; Pro-qualified immunity; "Back the Blue" |

### Education (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-school choice** *(not on Geo yet)* | Supports giving families more options to choose schools, including public, charter, or private schools. | Pro-vouchers; Pro-charter schools; Pro-education freedom; Pro-parental choice; Pro-ESA; Pro-universal school choice; Parent empowerment |
| **Pro-public education** *(not on Geo yet)* | Supports public schools and public investment in education. | Voucher skeptic; Public school advocate; Pro-public school funding; Pro-neighborhood schools; Voucher opponent |

### Use of force (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Dove** *(not on Geo yet)* | Favors restraint in using military force and prefers diplomacy or limited commitments. | Restrainer; Non-interventionist; Anti-war; Realist; Pro-diplomacy; Pro-military restraint |
| **Hawk** *(not on Geo yet)* | Favors a more forceful foreign policy and is comparatively willing to use military power. | Interventionist; Internationalist; Primacist; Liberal internationalist; Pro-deterrence |

### Iran (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-Iran containment** *(not on Geo yet)* | Favors limiting Iran’s regional influence through deterrence, sanctions, or other pressure. | Pro-maximum pressure; Pro-strikes on Iran; Pro-pressure on Iran; Iran deal critic; Pro-sanctions on Iran; Pro-snapback |
| **Pro-Iran diplomacy** *(not on Geo yet)* | Supports negotiating with Iran and using diplomacy to manage disputes or reduce conflict. | Pro-Iran deal; Iran dove; Pro-JCPOA; Pro-engagement with Iran; Pro-nuclear deal; Pro-diplomacy with Iran; Iran engager |

### Trade (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-trade** *(not on Geo yet)* | Favors reducing barriers to international trade and maintaining open trade relationships. | Free trader; Pro-globalization; Pro-trade deals; Free-trade; Pro-open trade; Trade liberal |
| **Protectionist** *(not on Geo yet)* | Supports trade barriers or domestic preferences intended to protect local industries and workers from foreign competition. | Pro-tariffs; Economic nationalist; Pro-fair trade; Trade hawk; Tariff hawk; America First trade; Pro-reshoring |

### Welfare (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-welfare expansion** *(not on Geo yet)* | Supports expanding public benefits or social programs that provide income, health, or other assistance. | Pro-welfare state; Pro-social programs; Pro-safety net; Pro-social insurance; Pro-Medicaid expansion; Pro-SNAP |
| **Pro-welfare reform** *(not on Geo yet)* | Supports changing public assistance programs, often by emphasizing work requirements, eligibility rules, or reduced dependency. | Pro-work requirements; Welfare skeptic; Workfare; Welfare-to-work; Pro-self-sufficiency; Pro-work |

### Crypto (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Crypto skeptic** *(not on Geo yet)* | Questions the benefits or safety of cryptocurrencies and favors caution or stronger safeguards. | Crypto critic; Bitcoin skeptic; Pro-investor protection; Crypto regulation advocate; Pro-bank-style crypto rules |
| **Pro-crypto** *(not on Geo yet)* | Supports cryptocurrencies and policies that enable their use or growth. | Crypto advocate; Pro-digital assets; Pro-Bitcoin; Crypto supporter; Crypto-friendly; Crypto booster; Pro-crypto innovation |

### Minimum wage (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-wage flexibility** *(not on Geo yet)* | Favors allowing wages to adjust with market conditions and opposes mandatory wage floors or increases. | Minimum wage skeptic; Pro-entry-level jobs; Wage-mandate skeptic |
| **Pro-living wage** *(not on Geo yet)* | Supports wages sufficient to meet basic living costs, often through a higher minimum wage. | Pro-$15 minimum wage; Raise the Wage; Fight for $15; Pro-higher minimum wage; Pro-wage floor; "Fight for $15" |

### Taiwan (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-Taiwan independance** *(not on Geo yet)* | Supports Taiwan becoming or remaining formally independent from the People’s Republic of China. | Taiwan hawk; Pro-defense commitment to Taiwan; Pro-Taiwan security |
| **Pro-Taiwan reunification** *(not on Geo yet)* | Supports political unification of Taiwan with the People’s Republic of China. | Taiwan restraint; Pro-cross-strait dialogue |

### Gender identity (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Gender-critical** *(not on Geo yet)* | Holds that sex is a relevant category distinct from gender identity, especially in law or sex-separated settings. | Pro-sex-based rights; Pro-sex-based policies; Pro-women's sports; Pro-biological sex; Gender ideology critic; Pro-single-sex spaces; Pro-Protect Women's Sports Act |
| **Pro-transgender rights** *(not on Geo yet)* | Supports equal legal rights and protections for transgender people. | Pro-trans rights; Pro-gender-affirming care; Pro-trans inclusion; Trans-inclusive; Trans ally; Pro-gender identity protections |

### Alliances (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **NATO skeptic** *(not on Geo yet)* | Questions NATO’s purpose, costs, expansion, or members’ obligations. | Pro-burden shifting; America First; Alliance skeptic; Burden-shifter; Pro-dormant NATO; Pro-European defense autonomy |
| **Transatlanticist** *(not on Geo yet)* | Supports close political, security, and diplomatic ties between North America and Europe, including NATO. | Atlanticist; Pro-alliances; NATO supporter; Pro-collective defense; Pro-Article 5 |

### Climate (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Climate skeptic** *(not on Geo yet)* | Questions the extent, causes, impacts, or policy implications of human-caused climate change. | Climate realist; Climate action skeptic; Climate denier (pejorative); Climate doubter; Lukewarmer; Climate contrarian |
| **Pro-climate action** *(not on Geo yet)* | Supports public or private measures to reduce climate change or adapt to its effects. | Pro-climate; Climate hawk; Climate advocate; Pro-decarbonization; Pro-net zero; Climate activist |

### LGBTQ (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-LGBTQ rights** *(not on Geo yet)* | Supports equal legal rights and protections for LGBTQ people. | Pro-same-sex marriage; Pro-gay rights; Pro-marriage equality; Pro-LGBTQ equality; LGBTQ ally; Pro-Equality Act |
| **Social conservative** *(not on Geo yet)* | Favors traditional social norms and policies, often including conventional views of family, sexuality, and gender. | Pro-family values; Pro-natural marriage; Pro-family; Pro-biblical marriage; Pro-man-woman marriage |

### Public health (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-vaccination** *(not on Geo yet)* | Supports vaccination and policies that promote uptake to protect public health. | Pro-public health measures; Pro-vaccine; Pro-immunization requirements; Pro-school vaccine requirements |
| **Pro-vaccine choice** *(not on Geo yet)* | Supports individual choice about vaccination and opposes vaccine mandates. | Pro-vaccine exemptions; Pro-health freedom; Mandate skeptic; Pro-medical liberty |

### Drugs (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-legalization** *(not on Geo yet)* | Supports removing criminal penalties for at least some currently prohibited drugs. | Pro-decriminalization; Pro-cannabis legalization; Pro-harm reduction; Drug policy reformer; Pro-drug policy reform; Pro-cannabis reform |
| **Anti-legalization** *(not on Geo yet)* | Opposes legalizing currently prohibited drugs. | Pro-war on drugs; Drug warrior; Prohibitionist; Pro-recriminalization; Pro-drug enforcement; Pro-drug-free |

### Religion (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Church-state separationist** *(not on Geo yet)* | Supports keeping government institutions and religious institutions legally separate. | Pro-separation of church and state; Separationist; Pro-secular government; Pro-Establishment Clause |
| **Pro-religious freedom** *(not on Geo yet)* | Supports the right to practice religion and protections for religious belief and exercise. | Pro-faith in public life; Pro-conscience rights; Accommodationist; Pro-religious exemptions; Pro-free exercise |

### Foreign aid (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-USAID** *(not on Geo yet)* | Supports U.S. foreign assistance administered through USAID. | Pro-development aid; Development advocate; Aid advocate; Pro-global health aid; Pro-soft power |
| **Pro-foreign aid reform** *(not on Geo yet)* | Supports changing foreign assistance programs to improve their effectiveness, scope, or accountability. | Pro-foreign aid cuts; Foreign aid critic; Aid skeptic; Pro-aid reform; Pro-America First aid; Pro-USAID overhaul |

### AI (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-AI acceleration** *(not on Geo yet)* | Favors rapid development and adoption of artificial intelligence, with limited constraints on innovation. | Accelerationist; e/acc; Pro-AI innovation; AI booster; Pro-light-touch AI; Pro-AI preemption; AI optimist |
| **Pro-AI regulation** *(not on Geo yet)* | Supports rules or oversight governing the development or use of artificial intelligence. | Pro-AI safety; AI safety advocate; AI doomer (pejorative); Pro-AI guardrails; Pro-AI oversight; AI safetyist; Pro-state AI laws |

### Israel–Palestine (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-Palestinian** *(not on Geo yet)* | Supports Palestinian rights, interests, or political self-determination. | Pro-Palestine; Palestinian rights advocate; Israel critic; Palestine solidarity; Israel aid skeptic |
| **Pro-Israel** *(not on Geo yet)* | Supports Israel’s security, interests, or right to exist as a Jewish state. | Israel supporter; Zionist; Israel hawk; Pro-Israel aid; Israel ally; Pro-US-Israel alliance |
| **Anti-Zionist** *(not on Geo yet)* | Opposes Zionism, the movement supporting Jewish national self-determination in the historic land of Israel; views on Israel, Palestinians, and Jewish people vary among anti-Zionists. |  |

### Housing (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Neighborhood preservation** *(not on Geo yet)* | Favors protecting the character or stability of existing residential neighborhoods, often through local land-use controls. | Pro-neighborhood character; NIMBY (pejorative); Slow-growth; Neighborhood preservationist; Pro-single-family zoning; Pro-home rule |
| **Pro-housing development** *(not on Geo yet)* | Supports building more housing or reducing barriers to new residential construction. | YIMBY; Pro-zoning reform; Pro-abundance; Pro-housing; Pro-supply; Pro-density; Pro-building |

### Nuclear (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-nuclear power** *(not on Geo yet)* | Supports using or expanding nuclear energy to generate electricity. | Pro-nuclear; Nuclear advocate; Nuclear supporter; Pro-nuclear energy; Pro-nuclear expansion; Pro-advanced reactors |
| **Anti-nuclear** *(not on Geo yet)* | Opposes nuclear power or its expansion. | Nuclear critic; Nuclear opponent; Nuclear power opponent; Nuclear safety advocate; No-nukes |

### Taxes (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Tax fairness** *(not on Geo yet)* | Supports tax rules intended to distribute the tax burden fairly, often through higher contributions from affluent taxpayers. | Pro-tax the rich; Pro-wealth tax; Pro-higher taxes on the wealthy; Pro-fair share; Tax-the-rich; Pro-billionaire tax |
| **Pro-tax cuts** *(not on Geo yet)* | Supports reducing tax rates or the amount of tax people or businesses pay. | Tax cutter; Low-tax; Anti-tax; Supply-sider; Taxpayer advocate; Pro-flat tax; "Read my lips: no new taxes" |

### Immigration (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-immigration** *(not on Geo yet)* | Supports immigration or policies that make immigration and immigrant integration easier. | Pro-immigrant; Pro-amnesty; Open borders (pejorative); Immigrant rights advocate; Immigration advocate; Pro-pathway to citizenship |
| **Pro-border security** *(not on Geo yet)* | Supports stronger enforcement and security measures at national borders. | Pro-deportation; Immigration restrictionist; Immigration hawk; Border hawk; Low-immigration |

### Ukraine (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-Ukraine** *(not on Geo yet)* | Supports Ukraine’s sovereignty and its defense against Russia’s invasion. | Pro-Ukraine aid; Ukraine supporter; Ukraine hawk; Russia hawk; Pro-Kyiv; Pro-sanctions on Russia |
| **Pro-Russia** *(not on Geo yet)* | Supports Russia’s government, interests, or policies in a given dispute. | Pro-Russia (pejorative); Ukraine skeptic |

### Social Security (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-entitlement reform** *(not on Geo yet)* | Supports changing large public benefit programs such as Social Security to address their long-term financing or structure. | Pro-Social Security reform; Pro-Social Security privatization; Entitlement reformer; Pro-solvency; Pro-personal accounts; Pro-retirement age increase |
| **Benefit preservation** *(not on Geo yet)* | Supports maintaining existing public benefits, especially Social Security benefits. | Pro-Social Security; Pro-entitlements; Expand Social Security; Pro-Social Security 2100; Pro-benefit increase |

### Student debt (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-repayment** *(not on Geo yet)* | Favors borrowers repaying student loans and opposes or limits loan cancellation. | Loan forgiveness skeptic; Pro-borrower responsibility; Pro-taxpayer fairness; Debt cancellation critic |
| **Pro-student debt relief** *(not on Geo yet)* | Supports reducing or cancelling student loan debt for borrowers. | Pro-loan forgiveness; Pro-free college; Pro-debt cancellation; Cancel student debt; Pro-debt relief; Debt abolitionist |

### Spending & deficit (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-public spending** *(not on Geo yet)* | Supports government spending on public programs, services, or investment. | Pro-government investment; Deficit dove; Keynesian; Pro-public investment; Fiscal dove; Deficit owl; Pro-stimulus |
| **Pro-fiscal responsibility** *(not on Geo yet)* | Favors limiting deficits and public debt through spending discipline, revenue, or both. | Deficit hawk; Pro-balanced budget; Fiscal conservative; Budget hawk; Spending hawk; Debt hawk |

### Elections (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-election integrity** *(not on Geo yet)* | Prioritizes safeguards intended to ensure elections are lawful, accurate, and secure. | Pro-voter ID; Pro-election security; Pro-proof of citizenship; Pro-SAVE Act; Pro-secure elections; Pro-voter roll integrity |
| **Pro-voting rights** *(not on Geo yet)* | Supports protecting or expanding access to voting and participation in elections. | Pro-ballot access; Pro-mail voting; Pro-voter participation; Pro-automatic voter registration; Pro-John Lewis Act |

### Guns (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-gun control** *(not on Geo yet)* | Supports laws that restrict or regulate access to firearms. | Pro-gun safety; Pro-gun reform; Gun-control advocate; Gun violence prevention; Pro-gun violence prevention; Pro-gun regulation; Pro-firearm regulation |
| **Pro-gun rights** *(not on Geo yet)* | Supports the right to own and use firearms, with limited government restrictions. | Pro-Second Amendment; Pro-2A; Gun-rights advocate; Pro-gun; Second Amendment supporter; Pro-gun owner; Pro-constitutional carry |

### Federalism (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-states' rights** *(not on Geo yet)* | Supports state governments’ authority relative to the federal government. | Federalist; Pro-decentralization; Pro-federalism; Pro-Tenth Amendment; Pro-state sovereignty; Tenth Amendment advocate |
| **Pro-federal authority** *(not on Geo yet)* | Supports federal government authority over states in areas assigned to or best handled by the national government. | Pro-national standards; Pro-federal preemption; Pro-national uniformity; Pro-federal supremacy; Pro-federal oversight |

### Energy (Climate energy & tech)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-energy production** *(not on Geo yet)* | Supports expanding domestic energy production, including fossil-fuel or other energy sources. | Pro-oil and gas; Pro-drilling; Pro-energy dominance; All-of-the-above; Pro-American energy; Pro-energy independence; "Drill, baby, drill" |
| **Pro-clean energy** *(not on Geo yet)* | Supports energy sources with lower greenhouse-gas emissions, such as renewables or nuclear power. | Pro-green energy; Clean energy advocate; Pro-energy transition; Pro-solar and wind; Pro-clean energy abundance |

### Healthcare (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-universal healthcare** *(not on Geo yet)* | Supports guaranteeing access to health coverage for everyone, usually through public programs or universal coverage rules. | Pro-Medicare for All; Pro-single-payer; Pro-public option; Pro-universal coverage; Medicare for All; Health care as a right; Pro-government health care |
| **Free-market healthcare** *(not on Geo yet)* | Favors market competition and private choice in healthcare, with a limited role for government. | Pro-private healthcare; Pro-health savings accounts; Obamacare critic; Consumer-driven healthcare; Pro-patient choice; Pro-market competition |

### China (Foreign policy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-China engagement** *(not on Geo yet)* | Supports diplomacy, trade, or cooperation with China rather than isolating or confronting it. | China dove; Pro-détente; Pro-trade with China; Engager; Pro-engagement; Competitive coexister; Pro-coexistence |
| **Pro-China containment** *(not on Geo yet)* | Favors limiting China’s power or influence through deterrence, alliances, or other pressure. | Pro-decoupling; China skeptic; New Cold Warrior; Pro-strategic competition; Pro-containment; China critic |

### DEI (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-meritocracy** *(not on Geo yet)* | Favors selection and advancement based on individual ability and performance rather than group identity or preferential treatment. | Anti-DEI; Pro-merit; Pro-colorblind policy; Pro-MEI; Pro-race-neutral policy; Pro-equal treatment |
| **Pro-equity** *(not on Geo yet)* | Supports policies intended to reduce disparities and improve fair access or outcomes across groups. | Pro-diversity; Pro-affirmative action; Pro-inclusion; DEI supporter; Pro-race-conscious policy; Pro-DEIA |

### Death penalty (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-death penalty** *(not on Geo yet)* | Supports retaining or applying capital punishment for certain serious crimes. | Pro-capital punishment; Death penalty supporter; Retentionist; Death penalty retentionist; Pro-retention |
| **Death penalty abolitionist** *(not on Geo yet)* | Supports ending capital punishment. | Anti-death penalty; Pro-abolition of capital punishment; Abolitionist; Pro-abolition; Pro-repeal; Death penalty opponent |

### Privacy (Justice & democracy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-national security** *(not on Geo yet)* | Prioritizes protecting the country from threats, including through security powers and surveillance. | Pro-national security surveillance; Pro-FISA; Security hawk; National security hawk; Pro-Section 702; Pro-clean reauthorization |
| **Pro-privacy** *(not on Geo yet)* | Supports protecting personal information and limiting unwarranted data collection or surveillance. | Pro-civil liberties; Pro-data protection; Surveillance critic; Privacy hawk; Pro-warrant requirement; Pro-Fourth Amendment; Civil libertarian |

### Abortion (Society)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-life** *(not on Geo yet)* | Opposes abortion, especially on the grounds that fetal life should receive legal protection. | Anti-abortion (AP style); Pro-abortion restrictions; Pro-personhood; Abortion abolitionist; Pro-unborn |
| **Pro-choice** *(not on Geo yet)* | Supports legal access to abortion and the right to decide whether to continue a pregnancy. | Abortion-rights (AP style); Pro-abortion rights; Pro-reproductive rights; Pro-reproductive freedom; Pro-bodily autonomy; Reproductive justice; Pro-Roe; "My body, my choice" |

### Labor (Economy)

| Leaning | Description | Also called |
|---|---|---|
| **Pro-union** *(not on Geo yet)* | Supports labor unions and collective bargaining rights for workers. | Pro-labor; Pro-collective bargaining; Pro-worker; Pro-organized labor; Union ally; Pro-PRO Act; Labor-backed |
| **Anti-union** *(not on Geo yet)* | Opposes labor unions or supports restricting their power, membership, or collective bargaining. | Pro-open shop; Union skeptic; Right-to-work; Pro-voluntary unionism; Pro-worker freedom; Pro-paycheck protection |

## Traditions

Classic ideologies. A tradition applies when the claim's position is distinctive of it, not simply the mainstream left or right position (rule I2).

### Classical liberal (Draft)

A political outlook emphasizing individual rights, civil liberties, the rule of law, limited government, and market economies.

- **T1** Protect individual rights and civil liberties, including free speech, against state power.
- **T2** Limited, constitutional government under the rule of law.
- **T3** Free markets defended as a matter of individual liberty.
- Not this tradition: A principle shared across the mainstream, such as the rule of law in general (see G4).
- Related: Libertarian, Liberal, Neoliberal, Conservative
- Usually found at: Center left, Center, Center right, Right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Nationalist (Draft)

An outlook prioritizing national identity, sovereignty, and interests. Nationalist movements may be left- or right-wing and vary in their views on immigration and international institutions.

- **T1** Put national identity, sovereignty and interests first, including over international bodies.
- Not this tradition: A state's official position in a territorial or sovereignty dispute (see G4).
- Related: MAGA, Paleoconservative, Populist
- Usually found at: Left, Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Globalist (Draft)

A political outlook favoring international cooperation, cross-border trade, and global institutions to address shared issues. The label is also used pejoratively, so context matters.

- **T1** International cooperation and global institutions to address shared problems.
- **T2** Open cross-border trade.
- **T3** Migration as a benefit.
- Not this tradition: A narrow bilateral deal or one foreign investment.
- Not this tradition: Never use the label as an insult: it applies only to the claim's own position.
- Related: Neoliberal, Liberal
- Usually found at: Left, Center left, Center, Center right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Secularist (Draft)

An outlook supporting separation of religious institutions from state authority and secular governance, while protecting freedom of belief.

- **T1** Separate religious institutions from state authority; secular government and law.
- **T2** Freedom of belief for everyone.
- Not this tradition: Defending one group's religious freedom.
- Related: Humanist, Liberal
- Usually found at: Left, Center left, Center, Center right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Conservative (Draft)

A political outlook that generally values tradition and social continuity and favors gradual change; priorities such as limited government, markets, and social norms vary by context.

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
- Related: MAGA, Traditionalist, Isolationist, Nationalist
- Usually found at: Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### MAGA (Draft)

The U.S. political movement organized around Donald Trump's Make America Great Again slogan, commonly associated with America First nationalism, restrictive immigration, and opposition to established political institutions.

- **T1** Donald Trump's Make America Great Again agenda and America First nationalism.
- **T2** Restrictive immigration and enforcement under Trump.
- **T3** Opposition to established political institutions.
- Not this tradition: Any position that does not invoke Trump, America First or MAGA (use the issue leaning instead).
- Related: Paleoconservative, Nationalist, Populist
- Usually found at: Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Democratic socialist (Draft)

An outlook supporting social ownership or public control of key sectors and broad social protections pursued through democratic elections and institutions.

- **T1** Social ownership or public control of key sectors.
- **T2** Universal public provision replacing private provision, such as single-payer healthcare or free college.
- **T3** Reaching these through elections and democratic institutions.
- Not this tradition: Revolution or one-party rule (see Communist).
- Related: Socialist, Social democrat, Progressive
- Usually found at: Far left, Left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Liberal (Draft)

In U.S. politics, a center-left outlook emphasizing civil liberties, individual rights, social equality, and government action to address economic or social problems. The term has different meanings internationally.

- **T1** Civil liberties and individual rights defended against state or majority restriction, such as due process or protecting unpopular speech.
- **T2** Social equality pursued through civil rights and equal treatment.
- Not this tradition: The international, free-market sense of the word: in Geo, Liberal means the US center-left outlook.
- Not this tradition: A mainstream left policy (taxes, spending, guns, climate, abortion, unions, student debt) argued without civil-liberties or equal-rights reasoning: that is the Left leaning.
- Related: Progressive, Social democrat, Classical liberal, Neoliberal
- Usually found at: Left, Center left, Center
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Socialist (Draft)

An outlook supporting social, public, or worker ownership or control of major productive resources. Socialist traditions differ on markets, democracy, and how ownership should work.

- **T1** Social, public or worker ownership or control of major productive resources.
- **T2** Caps on income or wealth set by law to reach economic equality (a tax is not a cap).
- Not this tradition: Welfare expansion within a market economy (see Social democrat).
- Related: Democratic socialist, Communist, Marxist, Social democrat
- Usually found at: Far left, Left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Feminist (Draft)

An outlook seeking political, economic, and social equality for women and opposing gender-based discrimination. Feminist traditions differ in their analysis and policy priorities.

- **T1** Political, economic and social equality for women.
- **T2** Oppose gender-based discrimination.
- Not this tradition: A family or abortion position not argued in terms of women's equality or rights.
- Related: Progressive, Liberal
- Usually found at: Far left, Left, Center left, Center
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Marxist (Draft)

An outlook based on Karl Marx's critique of capitalism and analysis of class relations and class struggle. Marxists differ on political strategy and social organization.

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

A political ideology aiming for a classless society with collective ownership of productive resources. Historical communist governments have often relied on one-party rule and centralized planning.

- **T1** Collective ownership of productive resources, toward a classless society.
- **T2** Overthrow capitalism, by revolution or one-party rule.
- Not this tradition: Reforms within a market economy, however large.
- Related: Marxist, Socialist, Anarchist
- Usually found at: Far left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Social democrat (Draft)

An outlook supporting a market economy alongside strong public services, social welfare, labor protections, unions, and progressive taxation, generally pursued through democratic reform.

- **T1** A market economy with strong public services and social welfare.
- **T2** Labor protections, unions and higher wages for workers.
- **T3** Progressive taxation, pursued through democratic reform.
- Not this tradition: Social ownership of industries (see Democratic socialist or Socialist).
- Related: Democratic socialist, Liberal, Progressive
- Usually found at: Left, Center left
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Humanist (Draft)

A worldview grounding ethics in human dignity, reason, and human welfare; humanist traditions vary in how they relate to religion.

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

A political and economic outlook favoring market competition and private enterprise, often including deregulation, privatization, free trade, and fiscal restraint. The term is contested.

- **T1** Market competition and private enterprise as the general engine of growth.
- **T2** Deregulation, privatization, free trade and fiscal restraint as a program.
- Not this tradition: Cutting the rules of one sector or project only.
- Not this tradition: Deregulation argued as individual liberty (see Libertarian).
- Related: Classical liberal, Libertarian, Conservative, Globalist
- Usually found at: Center left, Center, Center right, Right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Populist (Draft)

A political outlook framing politics as a struggle between ordinary people and a powerful elite and claiming to represent the people. It can be left- or right-wing.

- **T1** Frame politics as ordinary people against a powerful elite, claiming to represent the people.
- Not this tradition: Criticism of a specific official or company without people-versus-elite framing.
- Related: MAGA, Nationalist, Progressive
- Usually found at: Far left, Left, Center left, Center, Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Libertarian (Draft)

An outlook prioritizing individual liberty and sharply limited government, usually combining free-market economics with broad personal freedoms.

- **T1** Sharply limited government.
- **T2** Free markets and opposition to economic mandates such as minimum wages.
- **T3** Broad personal freedoms, for example on drugs, guns and speech.
- Not this tradition: Deregulation argued for growth rather than liberty (see Neoliberal).
- Related: Classical liberal, Anarchist, Neoliberal
- Usually found at: Far left, Left, Center left, Center, Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Islamist (Draft)

A political outlook advocating that Islamic principles or law influence government and public life. Islamist movements vary widely and are distinct from Muslim identity and the religion of Islam.

- **T1** Islamic principles or law should shape government and public life.
- Not this tradition: Claims about Muslims' rights, Muslim identity or the religion of Islam itself.
- Related: none
- Usually found at: Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Environmentalist (Draft)

An outlook prioritizing protection of the natural environment and ecosystems, often through conservation, pollution reduction, and climate action.

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

A political outlook that draws on Christian beliefs to shape public policy, particularly on abortion, marriage, religious liberty, and education.

- **T1** Restrict or ban abortion.
- **T2** Defend traditional marriage and the family as the basis of society.
- **T3** Christian or traditional religious practice in public life and schools, and religious liberty for it.
- Not this tradition: Positions that touch none of abortion, marriage and family, religion or education.
- Not this tradition: Other faiths, or education and parental-rights positions with no religious element.
- Related: Traditionalist, Conservative, Paleoconservative
- Usually found at: Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Isolationist (Draft)

An outlook favoring limited involvement in foreign wars, alliances, and international commitments, with priority given to domestic affairs.

- **T1** Limit involvement in foreign wars, alliances and international commitments.
- **T2** Put domestic affairs ahead of foreign commitments.
- Not this tradition: Opposition to one intervention argued only on that intervention's merits.
- Related: Paleoconservative, MAGA, Populist
- Usually found at: Far left, Left, Center left, Center, Center right, Right, Far right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

### Anarchist (Draft)

A political outlook opposing the state and other coercive hierarchies and favoring voluntary association and self-governance. Anarchist traditions differ widely on property, markets, and social organization.

- **T1** Abolish the state or replace it with voluntary association and self-governance.
- **T2** Reject coercive hierarchies such as police, prisons or bosses.
- Not this tradition: Calls to shrink or reform government while keeping it.
- Related: Communist, Marxist, Libertarian
- Usually found at: Far left, Left, Right
- Source: Armando's Notion doc "Leanings" (2026-10-23)

