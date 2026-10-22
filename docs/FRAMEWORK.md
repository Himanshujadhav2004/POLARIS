# Political leaning and ideology scoring framework (framework-v1)

Every classification cites the numbered criteria below. The model finds evidence and matches criteria; code turns the matches into the final leaning and confidence, so the same matches always give the same result.

## Definitions

- **Political leaning**: A position on the left-right political spectrum, from far left to far right through the center. Declared bias and Detected bias both use it, so one scale compares an entity's claim with others' ratings.
- **Ideology**: A worldview about how society, the economy and government should be organized, named after its followers, such as libertarian or socialist. Unlike Political leaning, it names a tradition of ideas rather than a place on the left-right spectrum.

Possible results: one of Geo's seven leanings (Far left … Far right), each marked **Clear** or **Potential**; **Uncertain** (with the reason); or **No political position** (with the check that failed).

## Step 1: does the claim take a political position?

All four checks must pass. If one fails, the result is *No political position*, naming the reason.

| Check | Passes when | Fails when | Reason given |
|---|---|---|---|
| **G1** Takes a position | The claim argues for or against something: "should", "must", "ought", "is justified", "is wrong", or a judgement about a policy or group. | Neutral descriptions, statistics, predictions, definitions and histories. | descriptive |
| **G2** In its own voice | The position belongs to the claim itself. | The position is attributed: "X said", "X argued", "according to", "a study found", "group Y believes". | attributed |
| **G3** Political subject | It concerns public policy, law, rights, government, the economy or how society should be organized. | Personal or relationship advice, business strategy, product judgements, technical, medical or scientific claims. | not political |
| **G4** Contested | Mainstream political camps disagree about it. | Principles shared across the mainstream (rule of law, democracy, free expression in general), a country's official position in a territorial or sovereignty dispute, or a goal stated without a means ("reduce poverty"). | consensus |

## Step 2: score each topic area the claim addresses

Scores run from −3 (Far left) to +3 (Far right). Each score names the Geo leaning it corresponds to.

### ECO: Economy, taxes and work

Covers: Taxes, public spending, welfare and public services, labour and unions, markets and regulation, housing, healthcare and education funding.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **ECO-3L** | -3 Far left | Replace or abolish market capitalism: nationalize the economy, abolish private ownership of major industries, cap income or wealth by law, or expropriate. | "There should be a maximum legal income"; "All major industries should be nationalized" |
| **ECO-2L** | -2 Left | Expand the state's economic role well beyond current mainstream center-left policy: single-payer healthcare, tuition-free public universities, wealth taxes, abolishing private provision of a public service, worker seats on company boards. | "U.S. public universities should charge no tuition"; "Workers should be entitled to company board seats" |
| **ECO-1L** | -1 Center left | Mainstream center-left economic policy: higher taxes on high earners or corporations, expanding existing public programs, raising the minimum wage, stronger consumer or financial regulation, protecting unions and job tenure. | "The minimum wage should be raised"; "U.S. public-school teachers should have tenure" |
| **ECO-0** | 0 Center | Explicitly argues for a balance or compromise between market and state, rejecting both expansion and reduction as such. | "The debate should focus on the right balance of financial rules, not eliminating them entirely" |
| **ECO-1R** | +1 Center right | Mainstream center-right economic policy: lower taxes, deficit and spending restraint, less regulation, market competition and school choice in public services, limits on union power. | "The federal deficit should be capped at 3% of GDP"; "Democratic governors should opt in to the Federal Scholarship Tax Credit program" |
| **ECO-2R** | +2 Right | Shrink the state's economic role well beyond mainstream center-right policy: abolish major agencies or programs, a flat tax, privatize Social Security or Medicare, abolish the minimum wage. | "The minimum wage should be abolished"; "Social Security should be privatized" |

### SOC: Social and cultural values

Covers: Abortion, LGBTQ rights, gender roles and family, religion in public life, race and identity, drugs and personal morality, school curricula.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **SOC-3L** | -3 Far left | Abolish core social institutions such as marriage or the family, or suppress religion in private life. | "Marriage should be abolished as a legal institution" |
| **SOC-2L** | -2 Left | Social change well beyond mainstream center-left policy: abortion without restriction including for minors without consent, decriminalizing all drugs, reparations. | "Minors should be allowed abortions without parental consent"; "All recreational drugs should be legalized" |
| **SOC-1L** | -1 Center left | Mainstream center-left social policy: protect abortion access, LGBTQ rights and recognition, gender-equality measures, anti-discrimination and diversity, secular public institutions, legal marijuana. | "Same-sex marriage should remain legal"; "People who want to participate in the culture of a different gender should be supported" |
| **SOC-0** | 0 Center | Explicitly argues for a compromise between socially liberal and socially conservative positions. | "Abortion should be legal early in pregnancy and restricted later" |
| **SOC-1R** | +1 Center right | Mainstream center-right social policy: limits on abortion after a set point, parental rights in education, traditional marriage and family, religious-liberty exemptions, limits on gender-transition care for minors. | "The traditional nuclear family is still the best environment for raising children" |
| **SOC-2R** | +2 Right | Social conservatism well beyond mainstream center-right policy: near-total abortion bans, criminalizing abortion travel, reversing same-sex marriage, abolishing no-fault divorce, religious instruction in public schools. | "Traveling to another state for an abortion should be criminalized"; "No-fault divorce should be abolished" |
| **SOC-3R** | +3 Far right | Remove civil rights from people because of race, religion or sexuality, criminalize homosexuality, or impose religious rule. | "Homosexuality should be criminalized" |

### NAT: Immigration, citizenship and national identity

Covers: Immigration levels and enforcement, refugees and asylum, citizenship, national identity and belonging.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **NAT-3L** | -3 Far left | Abolish national borders or all immigration control. | "National borders should be abolished" |
| **NAT-2L** | -2 Left | Go well beyond mainstream center-left policy: abolish immigration enforcement agencies, end deportations, blanket amnesty. | "ICE should be abolished" |
| **NAT-1L** | -1 Center left | Mainstream center-left policy: a path to citizenship, protection for refugees, due process and limits on enforcement tactics for migrants. | "ICE should reveal third-country destinations before migrants lose their chance to object" |
| **NAT-0** | 0 Center | Explicitly pairs stronger enforcement with legal pathways as a compromise. | "Immigration reform should pair stronger border security with a path to citizenship" |
| **NAT-1R** | +1 Center right | Mainstream center-right policy: stronger border enforcement, lower immigration levels, deporting people who commit crimes, workplace verification. | "The US should hire more border agents" |
| **NAT-2R** | +2 Right | Go well beyond mainstream center-right policy: end birthright citizenship, mass deportation, an immigration moratorium. | "Birthright citizenship should be ended" |
| **NAT-3R** | +3 Far right | Exclude or remove people because of ethnicity or religion, or strip citizenship from groups. | "Muslims should be barred from entering the country" |

### LAW: Law, justice, guns and elections

Covers: Policing, courts and sentencing, guns, the death penalty, voting rules and electoral institutions.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **LAW-3L** | -3 Far left | Abolish the police or prisons. | "Police departments should be abolished" |
| **LAW-2L** | -2 Left | Go well beyond mainstream center-left policy: sharply defund the police, mandatory gun buybacks, end most incarceration. | "Assault weapons should be subject to mandatory buybacks" |
| **LAW-1L** | -1 Center left | Mainstream center-left policy: gun-safety laws (background checks, magazine limits, assault-weapon bans), police accountability, sentencing reform, wider voting access, abolishing the Electoral College. | "Large-capacity magazine limits should remain enforceable during appeals"; "The Electoral College should be abolished" |
| **LAW-0** | 0 Center | Explicitly balances public safety and civil liberties as a compromise. | "Police should get more funding and stronger accountability rules" |
| **LAW-1R** | +1 Center right | Mainstream center-right policy: gun rights, tougher sentencing, more police funding, voter ID and election-security rules, the death penalty. | "Voters should be required to show photo ID" |
| **LAW-2R** | +2 Right | Go well beyond mainstream center-right policy: repeal most gun laws, deploy the military for domestic policing, broadly restrict voting. | "All federal gun laws should be repealed" |
| **LAW-3R** | +3 Far right | Suspend elections or civil liberties for opponents, rule by decree, or endorse political violence. | "The president should be able to suspend elections during a crisis" |

### ENV: Environment and energy

Covers: Climate policy, pollution, conservation, fossil fuels and renewable energy.

| Criterion | Score | Matches when the claim | Examples |
|---|---|---|---|
| **ENV-3L** | -3 Far left | Abandon economic growth or the market economy to protect the climate. | "Economic growth should be abandoned to save the climate" |
| **ENV-2L** | -2 Left | Go well beyond mainstream center-left policy: ban new fossil-fuel projects, rapid forced phase-out of fossil fuels. | "All new oil and gas drilling should be banned" |
| **ENV-1L** | -1 Center left | Mainstream center-left policy: climate regulation, emission limits, renewable-energy subsidies, conservation limits. | "The federal government should subsidize solar installations for low-income families" |
| **ENV-0** | 0 Center | Explicitly supports an all-of-the-above energy compromise. | "The US should expand both renewables and natural gas" |
| **ENV-1R** | +1 Center right | Mainstream center-right policy: expand domestic oil and gas, faster permitting, put energy costs ahead of climate rules. | "Permitting for natural gas pipelines should be streamlined" |
| **ENV-2R** | +2 Right | Go well beyond mainstream center-right policy: abolish the environmental regulator or leave all climate agreements and rules. | "The EPA should be abolished" |

### Cross-cutting topics (recorded, never scored)

- **X-FOR** Foreign policy, war and alliances: Interventionism and restraint are both found on the left and the right.
- **X-TRADE** Trade and tariffs: Protectionism is held by the populist left and the populist right.
- **X-TECH** Technology, AI, privacy and surveillance: Regulation and civil-liberties concerns come from both sides.
- **X-SPEECH** Free expression and content moderation in general: Scored only when the claim ties it to a partisan position in another topic area.
- **X-INST** Government structure and procedure: Federalism, courts and agencies, unless tied to a partisan goal in another topic area.

## Step 3: combining rules

- **C1 Country context.** Place a position relative to the mainstream politics of the country or region the claim is about. The examples are from the United States. If placement depends on a country the claim does not make clear, the leaning is Uncertain.
- **E1 Evidence.** Every criterion and ideology must quote the exact words from the claim that match it. Context (topics, tags, sources, related claims) can help read the claim but is never evidence.
- **H1 Hedged wording.** If the claim is hedged or descriptive ("can", "may", "might", "tends to", "often", "in some cases"), its score moves one step toward the center and is capped at Center left or Center right.
- **A1 Mixed signals.** If one topic area scores left (−1 or lower) and another scores right (+1 or higher), the leaning is Uncertain (mixed signals), never Center.
- **A2 Combining topic areas.** When all scored topic areas point the same way, the leaning is their average, rounded toward the center.
- **A3 Center.** Center is given only when a Center criterion (…-0) matches. A claim with no scored topic area is Uncertain (cross-cutting).
- **A4 Far left and far right.** Far left or Far right is given only when a −3 or +3 criterion matches.

## Step 4: ideologies

- **I1.** Assign an ideology only when the claim explicitly matches one of its core beliefs, quoted as evidence, and none of its exclusions applies.
- **I2.** Never infer an ideology from the topic alone. For example, an abortion claim is Christian conservative only with religious framing, and Feminist only when argued as women's rights.
- **I3.** Clear when the matched belief is distinctive to that ideology and the independent probability is at least 0.8. Potential when the belief is shared with neighbouring ideologies or the probability is 0.5–0.8, with the alternatives listed. Dropped below 0.5.
- **I4.** At most two ideologies per claim.

Each ideology has a definition card (below). A belief marked *distinctive* belongs to that ideology alone; a *shared* belief gives at most Potential.

## Step 5: confidence (0–100)

| Part | Points | How it is scored |
|---|---|---|
| explicitness | 25 | 25 for direct, unhedged advocacy; 10 for hedged or descriptive wording. |
| match | 25 | 25 when the claim states a criterion's position directly, 15 when closely, 5 when only partly. |
| probability | 30 | 30 × the independent probability (Decisions API, gpt-6-luna) of the final leaning on the 7-point scale. If its probability that the claim takes a position is below 0.5, confidence is 0. |
| verifier | 20 | 20 when the independent verifier agrees with every part of the result, otherwise 0. |

Bands: **High** (80+) → Clear, **Medium** (60+) → Potential, **Low** (0+) → Uncertain. Initial thresholds. They are tuned on the test set so that High results are always correct.

## Ideology definition cards

### Anarchist (Draft)

An outlook that rejects the state and other coercive hierarchies, favoring voluntary cooperation and self-organized communities. Most currents sit on the far left, while anarcho-capitalists apply the same distrust of the state to free markets.

- **T1** Abolish the state, or replace it with voluntary, self-organized communities. *(distinctive)*
- **T2** Reject coercive hierarchies such as police, prisons or bosses in favour of mutual aid. *(shared)*
- Not this ideology: Calls to shrink or reform government while keeping it.
- Neighbours: Communist, Marxist, Libertarianism
- Usually found at: Far left, Left, Right
- Source: Geo Ideology description (draft until Armando approves)

### Christian conservative (Draft)

An outlook that brings Christian moral teaching into politics, notably on abortion, marriage, religious liberty and education. In the US it forms a core constituency of the Republican right, often called the religious right.

- **T1** Grounds a political position explicitly in Christian faith or morality. *(distinctive)*
- **T2** Restricts abortion, defends traditional marriage or religious liberty, argued on religious grounds. *(shared)*
- Not this ideology: The same positions without religious framing (use Conservative or Traditionalist, or no ideology).
- Neighbours: Traditionalist, Conservative, Paleoconservative
- Usually found at: Center right, Right, Far right
- Source: Geo Ideology description (draft until Armando approves)

### Classical liberal (Draft)

An outlook rooted in individual rights, the rule of law, limited government and free markets, as framed by thinkers such as Locke and Adam Smith. It is the common ancestor of modern liberals and libertarians.

- **T1** Limits government power to protect individual rights, explicitly as a matter of liberty. *(shared)*
- **T2** Free markets with limited government, framed as protecting individual liberty. *(shared)*
- **T3** Invokes the classical-liberal tradition of limited, constitutional government (Locke, Smith, natural rights). *(distinctive)*
- Not this ideology: General support for free speech or the rule of law (shared across the mainstream; see G4).
- Neighbours: Libertarianism, Liberal, Neoliberal, Conservative
- Usually found at: Center left, Center, Center right, Right
- Source: Geo Ideology description (draft until Armando approves)

### Communist (Draft)

An outlook that aims for a classless society in which property is held in common and the state eventually withers away. In practice it has meant one-party states with planned economies, at the far left.

- **T1** Common ownership of property and the means of production, toward a classless society. *(distinctive)*
- **T2** Revolution or one-party rule to achieve it. *(distinctive)*
- Not this ideology: Reforms within a market economy, however large.
- Neighbours: Marxist, Socialist, Anarchist
- Usually found at: Far left
- Source: Geo Ideology description (draft until Armando approves)

### Conservative (Draft)

An outlook that values tradition, limited government, free enterprise and established social and moral norms, preferring gradual change over rupture. It anchors the center right and the right, though its priorities vary widely between countries.

- **T1** Preserve established institutions and norms; prefer gradual change over rupture. *(shared)*
- **T2** Combines limited government and free enterprise with traditional social norms. *(distinctive)*
- Not this ideology: A single economic policy (such as a tax cut) on its own: give a leaning, not an ideology.
- Neighbours: Traditionalist, Christian conservative, Paleoconservative, Neoconservative, Classical liberal
- Usually found at: Center right, Right
- Source: Geo Ideology description (draft until Armando approves)

### Democratic socialist (Draft)

An outlook that seeks social ownership of key industries and a strong welfare state, reached through elections and democratic institutions rather than revolution. In US politics it stands to the left of mainstream liberals.

- **T1** Social ownership of key industries or services, reached through democratic means. *(distinctive)*
- **T2** Universal public provision (single-payer healthcare, free college) as a step beyond the welfare state. *(shared)*
- Not this ideology: Revolution or one-party rule (Communist).
- Neighbours: Socialist, Social democrat, Progressive
- Usually found at: Left, Far left
- Source: Geo Ideology description (draft until Armando approves)

### Environmentalist (Draft)

An outlook that puts protecting ecosystems and the climate at the center of politics, often demanding limits on growth, pollution and fossil fuels. Green parties carry it, mostly on the left of the spectrum.

- **T1** Puts protecting ecosystems or the climate ahead of competing economic goals. *(distinctive)*
- **T2** Limits on pollution, fossil fuels or growth. *(shared)*
- Not this ideology: An environmental benefit mentioned only in passing.
- Neighbours: Progressive
- Usually found at: Far left, Left, Center left, Center
- Source: Geo Ideology description (draft until Armando approves)

### Fascist (Draft)

An outlook built on authoritarian nationalism, a single leader and party, suppression of opposition and the subordination of the individual to the state. It defined Mussolini's Italy and Nazi Germany and sits on the far right.

- **T1** Authoritarian nationalist rule by a single leader or party that suppresses opposition. *(distinctive)*
- **T2** Subordinates the individual to the nation-state. *(distinctive)*
- Not this ideology: Strong-leader rhetoric that keeps elections and opposition intact.
- Neighbours: Nationalist
- Usually found at: Far right
- Source: Geo Ideology description (draft until Armando approves)

### Feminist (Draft)

An outlook that seeks equal political, economic and social rights for women and challenges gender-based discrimination. Its currents range from liberal to radical, so feminists appear across the spectrum, most often on the left.

- **T1** Explicitly seeks equal rights or status for women, or challenges gender-based discrimination. *(distinctive)*
- **T2** Argues reproductive or bodily autonomy as a matter of women's rights. *(shared)*
- Not this ideology: An abortion or family claim not argued in terms of women's equality or rights.
- Neighbours: Progressive, Liberal
- Usually found at: Far left, Left, Center left, Center
- Source: Geo Ideology description (draft until Armando approves)

### Globalist (Draft)

An outlook that favors international cooperation, open trade, migration and strong global institutions to address shared problems. Critics also use the label pejoratively for elites accused of putting world interests ahead of national ones.

- **T1** Strengthens international institutions or cooperation, including over national sovereignty. *(distinctive)*
- **T2** Open trade and migration as a global good. *(shared)*
- Not this ideology: A narrow bilateral deal or foreign investment in one project.
- Not this ideology: Use only when the claim itself argues for international governance; the term is often used pejoratively.
- Neighbours: Neoliberal, Liberal
- Usually found at: Center left, Center, Center right
- Source: Geo Ideology description (draft until Armando approves)

### Humanist (Draft)

A worldview that grounds ethics and politics in reason, human dignity and shared welfare rather than religious authority. It cuts across the left-right spectrum, so its followers can sit anywhere from the left to the center right.

- **T1** Grounds ethics or policy explicitly in reason and human dignity rather than religious authority. *(distinctive)*
- Not this ideology: General humanitarian concern without that grounding.
- Neighbours: Secularist
- Usually found at: Left, Center left, Center, Center right
- Source: Geo Ideology description (draft until Armando approves)

### Islamist (Draft)

An outlook that wants Islamic law and principles to shape government and public life. Its currents range from parties working through elections to armed movements, and it is distinct from the Muslim faith itself.

- **T1** Islamic law or principles should shape government, law or public life. *(distinctive)*
- Not this ideology: Claims about Muslims' rights or religious freedom.
- Neighbours: none
- Usually found at: Right, Far right
- Source: Geo Ideology description (draft until Armando approves)

### Isolationist (Draft)

An outlook that wants a country to stay out of foreign wars, alliances and entanglements and to focus on domestic affairs. It has appeared on both the left and the right of American politics.

- **T1** Stay out of foreign wars, alliances or entanglements. *(distinctive)*
- **T2** Put domestic affairs ahead of foreign commitments. *(shared)*
- Not this ideology: Opposition to one specific intervention argued on its own merits.
- Neighbours: Paleoconservative, MAGA, Populist
- Usually found at: Far left, Left, Center left, Center, Center right, Right, Far right
- Source: Geo Ideology description (draft until Armando approves)

### Liberal (Draft)

An outlook built on civil liberties, individual rights and an active state that reduces inequality through gradual reform within existing institutions. In the US the label means center left, while elsewhere it often signals free-market positions.

- **T1** Gradual reform within existing institutions to reduce inequality or expand rights. *(shared)*
- **T2** Civil liberties and individual rights protected by an active state. *(shared)*
- Not this ideology: A single policy position: Liberal is broad, so it is at most Potential.
- Neighbours: Progressive, Social democrat, Classical liberal, Neoliberal
- Usually found at: Left, Center left, Center
- Source: Geo Ideology description (draft until Armando approves)

### Libertarianism (Draft)

An outlook that puts individual liberty first and wants minimal government in both economic and personal life, from taxes to drug policy. It pairs free-market economics with socially liberal stances, so it fits poorly on a single left-right axis.

- **T1** Minimal government in both economic and personal life, argued together. *(distinctive)*
- **T2** Oppose state restrictions on personal choices (drugs, speech, guns) as a matter of individual liberty. *(shared)*
- **T3** Free markets with minimal taxation and regulation, argued as liberty. *(shared)*
- Not this ideology: Deregulation argued for growth rather than liberty (see Neoliberal).
- Neighbours: Classical liberal, Anarchist, Neoliberal
- Usually found at: Far left, Left, Center left, Center, Center right, Right, Far right
- Source: Geo description of the duplicate value Libertarian; Libertarianism has none in Geo (draft until Armando approves)

### MAGA (Draft)

The political movement behind Donald Trump's Make America Great Again agenda, combining nationalism, America First trade and foreign policy, restrictive immigration and hostility to established institutions. It has been the dominant current on the Republican right since 2016.

- **T1** Explicitly invokes Trump, America First or Make America Great Again. *(distinctive)*
- **T2** Combines restrictive immigration, America First trade and hostility to established institutions. *(shared)*
- Not this ideology: A single restrictive policy without MAGA framing: give a leaning, or Nationalist with national-identity framing.
- Neighbours: Paleoconservative, Nationalist, Populist
- Usually found at: Right, Far right
- Source: Geo Ideology description (draft until Armando approves)

### Marxist (Draft)

An outlook that reads history and politics through class struggle and the critique of capitalism developed by Karl Marx. It shapes communist, socialist and academic currents alike, mostly on the far left and the left.

- **T1** Explains politics through class struggle or a critique of capitalism as exploitation. *(distinctive)*
- Not this ideology: Inequality concerns without class analysis.
- Neighbours: Communist, Socialist
- Usually found at: Far left, Left
- Source: Geo Ideology description (draft until Armando approves)

### Nationalist (Draft)

An outlook that puts the interests, identity and sovereignty of the nation first, often skeptical of immigration and international institutions. It can appear on the left in independence movements, but today mostly sits on the right.

- **T1** Puts the nation's interests, identity or sovereignty first, explicitly over international bodies or outsiders. *(distinctive)*
- **T2** Restricts immigration to protect national identity. *(shared)*
- Not this ideology: A state's official position in a territorial dispute (see G4).
- Not this ideology: Border management without national-identity framing.
- Neighbours: MAGA, Paleoconservative, Populist, Fascist
- Usually found at: Center right, Right, Far right, Left
- Source: Geo Ideology description (draft until Armando approves)

### Neoconservative (Draft)

An outlook that pairs conservative domestic views with an assertive foreign policy, using American power to spread democracy and confront rivals. It shaped Republican foreign policy in the 2000s and sits on the center right.

- **T1** Uses national power assertively abroad to spread democracy or confront rivals. *(distinctive)*
- Not this ideology: Defensive aid or deterrence alone.
- Neighbours: Conservative
- Usually found at: Center right, Right
- Source: Geo Ideology description (draft until Armando approves)

### Neoliberal (Draft)

An outlook that favors free markets, deregulation, privatization, open trade and fiscal restraint as the engine of growth. It shaped center-left and center-right governments alike from the 1980s onward, so it crosses party lines.

- **T1** Free markets, deregulation, privatization and open trade as the engine of growth. *(distinctive)*
- **T2** Fiscal restraint. *(shared)*
- Not this ideology: Deregulation argued as individual liberty (see Libertarianism).
- Neighbours: Classical liberal, Libertarianism, Conservative, Globalist
- Usually found at: Center left, Center, Center right, Right
- Source: Geo Ideology description (draft until Armando approves)

### Paleoconservative (Draft)

An outlook that defends tradition, national sovereignty and restricted immigration while opposing foreign interventions and free-trade deals. It predates MAGA but shares much of its program and sits on the right.

- **T1** Combines tradition, national sovereignty and restricted immigration with opposition to foreign intervention or free trade. *(distinctive)*
- Not this ideology: Any one of these positions on its own.
- Neighbours: MAGA, Traditionalist, Isolationist, Nationalist
- Usually found at: Right, Far right
- Source: Geo Ideology description (draft until Armando approves)

### Populist (Draft)

An outlook that frames politics as a struggle between ordinary people and a corrupt elite, and claims to speak for the people directly. It attaches to both left and right programs, so populists appear at both ends.

- **T1** Frames politics as ordinary people against a corrupt elite. *(distinctive)*
- Not this ideology: Criticism of a specific official or company without people-versus-elite framing.
- Neighbours: MAGA, Nationalist, Progressive
- Usually found at: Far left, Left, Center left, Center, Center right, Right, Far right
- Source: Geo Ideology description (draft until Armando approves)

### Progressive (Draft)

An outlook that seeks deep structural change to reduce economic inequality, advance racial justice and act on climate, rather than incremental reform. In US politics it sits on the left, beyond mainstream liberals.

- **T1** Deep structural change to reduce economic inequality, advance racial justice or act on climate, beyond incremental reform. *(distinctive)*
- **T2** Expand rights and protections for marginalized groups. *(shared)*
- Not this ideology: Incremental reform within existing programs (see Liberal).
- Neighbours: Liberal, Democratic socialist, Social democrat, Environmentalist
- Usually found at: Left, Center left
- Source: Geo Ideology description (draft until Armando approves)

### Secularist (Draft)

An outlook that wants religion kept separate from the state, with laws and public institutions grounded in non-religious reasoning. It defends freedom of belief for all and appears across the spectrum, more often on the left.

- **T1** Keep religion separate from the state, law or public institutions. *(distinctive)*
- Not this ideology: Defending one group's religious freedom.
- Neighbours: Humanist, Liberal
- Usually found at: Left, Center left, Center, Center right
- Source: Geo Ideology description (draft until Armando approves)

### Social democrat (Draft)

An outlook that keeps a market economy but tames it with a large welfare state, strong unions and progressive taxation. It accepts capitalism and reforms it from within, which places it on the center left.

- **T1** Keeps a market economy but expands the welfare state, unions or progressive taxation. *(distinctive)*
- **T2** Worker representation and strong labour rights within firms. *(shared)*
- Not this ideology: Social ownership of industries (see Democratic socialist or Socialist).
- Neighbours: Democratic socialist, Liberal, Progressive
- Usually found at: Center left, Left
- Source: Geo Ideology description (draft until Armando approves)

### Socialist (Draft)

An outlook that wants the means of production and key services owned or tightly steered by the public, to end class inequality. It ranges from gradual reformers to revolutionaries and sits firmly on the left.

- **T1** Public ownership or tight public control of the means of production or key services, to end class inequality. *(distinctive)*
- **T2** Legal limits on private wealth to achieve economic equality. *(shared)*
- Not this ideology: Welfare expansion within a market economy (see Social democrat).
- Neighbours: Democratic socialist, Communist, Marxist, Social democrat
- Usually found at: Far left, Left
- Source: Geo Ideology description (draft until Armando approves)

### Traditionalist (Draft)

An outlook that sees inherited customs, religion and social institutions as the foundation of a good society and distrusts rapid change. It underpins several conservative currents and sits on the right.

- **T1** Inherited customs, religion or traditional institutions (family, gender roles) as the foundation of society. *(distinctive)*
- **T2** Distrust of rapid social change. *(shared)*
- Not this ideology: Nostalgia without a claim about how society should be ordered.
- Neighbours: Conservative, Christian conservative, Paleoconservative
- Usually found at: Center right, Right, Far right
- Source: Geo Ideology description (draft until Armando approves)

### Zionist (Draft)

An outlook supporting a Jewish national homeland in the Land of Israel and, since 1948, the State of Israel. Its currents range from left-wing labor Zionism to right-wing religious and revisionist Zionism.

- **T1** Supports a Jewish national homeland, or Israel's existence and sovereignty as a Jewish state. *(distinctive)*
- Not this ideology: Support for one Israeli policy or military action on its own (foreign policy, X-FOR).
- Neighbours: Nationalist
- Usually found at: Far left, Left, Center left, Center, Center right, Right, Far right
- Source: Geo Ideology description (draft until Armando approves)

