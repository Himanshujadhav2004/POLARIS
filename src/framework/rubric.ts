/**
 * The scoring framework: the written criteria every classification must cite.
 * The prompt and docs/FRAMEWORK.md are generated from this file, so a rule change here
 * changes the agent. Bump FRAMEWORK_VERSION with every change.
 */
export const FRAMEWORK_VERSION = "framework-v2.1";

/** Geo's Political leaning values by score, left to right. */
export const LEANING_BY_SCORE = {
  "-3": "Far left",
  "-2": "Left",
  "-1": "Center left",
  "0": "Center",
  "1": "Center right",
  "2": "Right",
  "3": "Far right",
} as const;

export type Score = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export type LeaningName = (typeof LEANING_BY_SCORE)[keyof typeof LEANING_BY_SCORE];

/**
 * Left to right. Use this, never Object.values(LEANING_BY_SCORE): JavaScript orders integer-like
 * keys ("0", "1", …) before "-3", "-2", "-1", which would scramble the scale.
 */
export const LEANINGS_LEFT_TO_RIGHT: readonly LeaningName[] = ["Far left", "Left", "Center left", "Center", "Center right", "Right", "Far right"];

/**
 * What each level means, shared word for word by the scorer, the independent check and the
 * verifier, so all three place claims on the same scale. Geo's own value descriptions overlap
 * (a mainstream party position fits both "Left" and "Center left"), which made the checks
 * disagree by one level. Draft until Armando approves.
 */
export const LEVEL_RULES: Record<LeaningName, string> = {
  "Far left": "Replaces capitalism, abolishes core institutions (police, prisons, borders, the family), or seeks power by revolution.",
  Left: "Goes clearly beyond the center-left mainstream of the country, for example single-payer healthcare, a wealth tax or abolishing the immigration enforcement agency.",
  "Center left": "A position commonly held across the center-left mainstream of the country, for example higher taxes on high earners, protecting abortion access or background checks for gun sales.",
  Center: "Explicitly combines or balances a left and a right position as a compromise.",
  "Center right": "A position commonly held across the center-right mainstream of the country, for example lower taxes, voter ID or stronger border enforcement.",
  Right: "Goes clearly beyond the center-right mainstream of the country, for example a near-total abortion ban, ending birthright citizenship or abolishing a federal department.",
  "Far right": "Removes rights from people because of ethnicity, religion or sexuality, imposes religious rule, or ends elections or civil liberties for opponents.",
};

/** The level rules as a list, left to right, with the criterion score that reaches each level. */
export function levelRulesText(): string {
  return LEANINGS_LEFT_TO_RIGHT.map((name, i) => `- ${name} (${i > 3 ? "+" : ""}${i - 3}): ${LEVEL_RULES[name]}`).join("\n");
}

/** Geo's own type descriptions. The agent refuses to run if Geo's live text differs (see ScoringAgent). */
export const POLITICAL_LEANING_DEFINITION =
  "Describes the preferred ideas, values, and tendencies regarding how power, authority, and resources should be managed in society.";
export const IDEOLOGY_DEFINITION =
  "A worldview about how society, the economy and government should be organized, named after its followers, such as libertarian or socialist. Unlike Political leaning, it names a tradition of ideas rather than a place on the left-right spectrum.";

// ---------------------------------------------------------------------------
// Step 1: does the claim take a political position?

export interface GateCheck {
  id: "G1" | "G2" | "G3" | "G4";
  name: string;
  passes: string;
  fails: string;
  /** Shown as "No political position (<reason>)" when this check fails. */
  reason: "descriptive" | "attributed" | "not political" | "consensus";
}

export const STANCE_GATE: GateCheck[] = [
  {
    id: "G1",
    name: "Takes a position",
    passes: 'The claim argues for or against something: "should", "must", "ought", "is justified", "is wrong", or a judgement about a policy or group.',
    fails: "Neutral descriptions, statistics, predictions, definitions and histories.",
    reason: "descriptive",
  },
  {
    id: "G2",
    name: "In its own voice",
    passes: "The position belongs to the claim itself.",
    fails: 'The position is attributed: "X said", "X argued", "according to", "a study found", "group Y believes".',
    reason: "attributed",
  },
  {
    id: "G3",
    name: "Political subject",
    passes: "It concerns public policy, law, rights, government, the economy or how society should be organized.",
    fails: "Personal or relationship advice, business strategy, product judgements, technical, medical or scientific claims.",
    reason: "not political",
  },
  {
    id: "G4",
    name: "Contested",
    passes: "Mainstream political camps disagree about it.",
    fails: 'Principles shared across the mainstream (rule of law, democracy, free expression in general), a country\'s official position in a territorial or sovereignty dispute, or a goal stated without a means ("reduce poverty").',
    reason: "consensus",
  },
];

// ---------------------------------------------------------------------------
// Step 2: score each topic area the claim addresses.

export type DimensionId = "ECO" | "SOC" | "NAT" | "LAW" | "ENV";

export interface Criterion {
  id: string;
  dimension: DimensionId;
  score: Score;
  text: string;
  examples: string[];
}

export interface Dimension {
  id: DimensionId;
  name: string;
  covers: string;
  criteria: Criterion[];
}

const c = (dimension: DimensionId, score: Score, text: string, examples: string[]): Criterion => ({
  id: `${dimension}${score === 0 ? "-0" : `-${Math.abs(score)}${score < 0 ? "L" : "R"}`}`,
  dimension,
  score,
  text,
  examples,
});

export const DIMENSIONS: Dimension[] = [
  {
    id: "ECO",
    name: "Economy, taxes and work",
    covers: "Taxes, public spending, welfare and public services, labour and unions, markets and regulation, housing, healthcare and education funding.",
    criteria: [
      c("ECO", -3, "Replace or abolish market capitalism: nationalize the economy, abolish private ownership of major industries, cap income or wealth by law, or expropriate.", ["There should be a maximum legal income", "All major industries should be nationalized"]),
      c("ECO", -2, "Expand the state's economic role well beyond current mainstream center-left policy: single-payer healthcare, tuition-free public universities, wealth taxes, abolishing private provision of a public service, worker seats on company boards.", ["U.S. public universities should charge no tuition", "Workers should be entitled to company board seats"]),
      c("ECO", -1, "Mainstream center-left economic policy: higher taxes on high earners or corporations, expanding existing public programs, raising the minimum wage, stronger consumer or financial regulation, protecting unions and job tenure.", ["The minimum wage should be raised", "U.S. public-school teachers should have tenure"]),
      c("ECO", 0, "Explicitly argues for a balance or compromise between market and state, rejecting both expansion and reduction as such.", ["The debate should focus on the right balance of financial rules, not eliminating them entirely"]),
      c("ECO", 1, "Mainstream center-right economic policy: lower taxes, deficit and spending restraint, less regulation, market competition and school choice in public services, limits on union power.", ["The federal deficit should be capped at 3% of GDP", "Democratic governors should opt in to the Federal Scholarship Tax Credit program"]),
      c("ECO", 2, "Shrink the state's economic role well beyond mainstream center-right policy: abolish major agencies or programs, a flat tax, privatize Social Security or Medicare, abolish the minimum wage.", ["The minimum wage should be abolished", "Social Security should be privatized"]),
    ],
  },
  {
    id: "SOC",
    name: "Social and cultural values",
    covers: "Abortion, LGBTQ rights, gender roles and family, religion in public life, race and identity, drugs and personal morality, school curricula.",
    criteria: [
      c("SOC", -3, "Abolish core social institutions such as marriage or the family, or suppress religion in private life.", ["Marriage should be abolished as a legal institution"]),
      c("SOC", -2, "Social change well beyond mainstream center-left policy: abortion without restriction including for minors without consent, decriminalizing all drugs, reparations.", ["Minors should be allowed abortions without parental consent", "All recreational drugs should be legalized"]),
      c("SOC", -1, "Mainstream center-left social policy: protect abortion access, LGBTQ rights and recognition, gender-equality measures, anti-discrimination and diversity, secular public institutions, legal marijuana.", ["Same-sex marriage should remain legal", "People who want to participate in the culture of a different gender should be supported"]),
      c("SOC", 0, "Explicitly argues for a compromise between socially liberal and socially conservative positions.", ["Abortion should be legal early in pregnancy and restricted later"]),
      c("SOC", 1, "Mainstream center-right social policy: limits on abortion after a set point, parental rights in education, traditional marriage and family, religious-liberty exemptions, limits on gender-transition care for minors.", ["The traditional nuclear family is still the best environment for raising children"]),
      c("SOC", 2, "Social conservatism well beyond mainstream center-right policy: near-total abortion bans, criminalizing abortion travel, reversing same-sex marriage, abolishing no-fault divorce, religious instruction in public schools.", ["Traveling to another state for an abortion should be criminalized", "No-fault divorce should be abolished"]),
      c("SOC", 3, "Remove civil rights from people because of race, religion or sexuality, criminalize homosexuality, or impose religious rule.", ["Homosexuality should be criminalized"]),
    ],
  },
  {
    id: "NAT",
    name: "Immigration, citizenship and national identity",
    covers: "Immigration levels and enforcement, refugees and asylum, citizenship, national identity and belonging.",
    criteria: [
      c("NAT", -3, "Abolish national borders or all immigration control.", ["National borders should be abolished"]),
      c("NAT", -2, "Go well beyond mainstream center-left policy: abolish immigration enforcement agencies, end deportations, blanket amnesty.", ["ICE should be abolished"]),
      c("NAT", -1, "Mainstream center-left policy: a path to citizenship, protection for refugees, due process and limits on enforcement tactics for migrants.", ["ICE should reveal third-country destinations before migrants lose their chance to object"]),
      c("NAT", 0, "Explicitly pairs stronger enforcement with legal pathways as a compromise.", ["Immigration reform should pair stronger border security with a path to citizenship"]),
      c("NAT", 1, "Mainstream center-right policy: stronger border enforcement, lower immigration levels, deporting people who commit crimes, workplace verification.", ["The US should hire more border agents"]),
      c("NAT", 2, "Go well beyond mainstream center-right policy: end birthright citizenship, mass deportation, an immigration moratorium.", ["Birthright citizenship should be ended"]),
      c("NAT", 3, "Exclude or remove people because of ethnicity or religion, or strip citizenship from groups.", ["Muslims should be barred from entering the country"]),
    ],
  },
  {
    id: "LAW",
    name: "Law, justice, guns and elections",
    covers: "Policing, courts and sentencing, guns, the death penalty, voting rules and electoral institutions.",
    criteria: [
      c("LAW", -3, "Abolish the police or prisons.", ["Police departments should be abolished"]),
      c("LAW", -2, "Go well beyond mainstream center-left policy: sharply defund the police, mandatory gun buybacks, end most incarceration.", ["Assault weapons should be subject to mandatory buybacks"]),
      c("LAW", -1, "Mainstream center-left policy: gun-safety laws (background checks, magazine limits, assault-weapon bans), police accountability, sentencing reform, wider voting access, abolishing the Electoral College.", ["Large-capacity magazine limits should remain enforceable during appeals", "The Electoral College should be abolished"]),
      c("LAW", 0, "Explicitly balances public safety and civil liberties as a compromise.", ["Police should get more funding and stronger accountability rules"]),
      c("LAW", 1, "Mainstream center-right policy: gun rights, tougher sentencing, more police funding, voter ID and election-security rules, the death penalty.", ["Voters should be required to show photo ID"]),
      c("LAW", 2, "Go well beyond mainstream center-right policy: repeal most gun laws, deploy the military for domestic policing, broadly restrict voting.", ["All federal gun laws should be repealed"]),
      c("LAW", 3, "Suspend elections or civil liberties for opponents, rule by decree, or endorse political violence.", ["The president should be able to suspend elections during a crisis"]),
    ],
  },
  {
    id: "ENV",
    name: "Environment and energy",
    covers: "Climate policy, pollution, conservation, fossil fuels and renewable energy.",
    criteria: [
      c("ENV", -3, "Abandon economic growth or the market economy to protect the climate.", ["Economic growth should be abandoned to save the climate"]),
      c("ENV", -2, "Go well beyond mainstream center-left policy: ban new fossil-fuel projects, rapid forced phase-out of fossil fuels.", ["All new oil and gas drilling should be banned"]),
      c("ENV", -1, "Mainstream center-left policy: climate regulation, emission limits, renewable-energy subsidies, conservation limits.", ["The federal government should subsidize solar installations for low-income families"]),
      c("ENV", 0, "Explicitly supports an all-of-the-above energy compromise.", ["The US should expand both renewables and natural gas"]),
      c("ENV", 1, "Mainstream center-right policy: expand domestic oil and gas, faster permitting, put energy costs ahead of climate rules.", ["Permitting for natural gas pipelines should be streamlined"]),
      c("ENV", 2, "Go well beyond mainstream center-right policy: abolish the environmental regulator or leave all climate agreements and rules.", ["The EPA should be abolished"]),
    ],
  },
];

/** Topics where positions do not line up with left and right. They are recorded but never scored. */
export const CROSS_CUTTING = [
  { id: "X-FOR", name: "Foreign policy, war and alliances", note: "Interventionism and restraint are both found on the left and the right." },
  { id: "X-TRADE", name: "Trade and tariffs", note: "Protectionism is held by the populist left and the populist right." },
  { id: "X-TECH", name: "Technology, AI, privacy and surveillance", note: "Regulation and civil-liberties concerns come from both sides." },
  { id: "X-SPEECH", name: "Free expression and content moderation in general", note: "Scored only when the claim ties it to a partisan position in another topic area." },
  { id: "X-INST", name: "Government structure and procedure", note: "Federalism, courts and agencies, unless tied to a partisan goal in another topic area." },
] as const;

export const ALL_CRITERIA: Criterion[] = DIMENSIONS.flatMap((d) => d.criteria);

// ---------------------------------------------------------------------------
// Rules applied while scoring and combining.

export const RULES = [
  { id: "C1", name: "Country context", text: "Place a position relative to the mainstream politics of the country or region the claim is about. The examples are from the United States. If placement depends on a country the claim does not make clear, the leaning is Uncertain." },
  { id: "E1", name: "Evidence", text: "Every criterion and ideology must quote the exact words from the claim that match it. Context (topics, tags, sources, related claims) can help read the claim but is never evidence." },
  { id: "H1", name: "Hedged wording", text: 'If the claim is hedged or descriptive ("can", "may", "might", "tends to", "often", "in some cases"), every topic-area score is capped at Center left or Center right (±1).' },
  { id: "A1", name: "Mixed signals", text: "If one topic area scores left (−1 or lower) and another scores right (+1 or higher), the leaning is Uncertain (mixed signals), never Center." },
  { id: "A2", name: "Combining topic areas", text: "When all scored topic areas point the same way, the leaning is their average, rounded toward the center." },
  { id: "A3", name: "Center", text: "Center is given only when a Center criterion (…-0) matches. A claim with no scored topic area is Uncertain (cross-cutting)." },
  { id: "A4", name: "Far left and far right", text: "Far left or Far right is given only when a −3 or +3 criterion matches." },
  { id: "A5", name: "Between two levels", text: "If the claim's position sits between two levels, match no criterion for that topic area. A missing label is always acceptable; a wrong one is not." },
] as const;

// ---------------------------------------------------------------------------
// Step 5: publish or leave blank. There are no partial labels: a leaning is published only when
// every rule passes, otherwise the claim gets no label and the failed rules are recorded.

export const PUBLISH = {
  /** Minimum independent probability that the claim takes a political position. */
  minStance: 0.8,
  /** Minimum independent probability of the exact leaning. */
  minLeaning: 0.7,
  /** Minimum independent probability of an ideology. */
  minIdeology: 0.9,
  /** A neighbouring ideology at or above this probability is checked for a match too (I6). */
  neighbour: 0.5,
  /** Scorer runs that must give the same answer. */
  runs: 3,
} as const;

export const PUBLISH_RULES = [
  { id: "P1", name: "Takes a position", text: `All four position checks pass, and the independent probability that the claim takes a position is at least ${PUBLISH.minStance}.` },
  { id: "P2", name: "Full match", text: "Every criterion behind the leaning matches directly or closely, not only in part, and the claim is not hedged." },
  { id: "P3", name: "Country clear", text: "The country or region whose politics the claim is about is clear." },
  { id: "P4", name: "Same level", text: `The independent check's most likely leaning is the same exact level, with a probability of at least ${PUBLISH.minLeaning}.` },
  { id: "P5", name: "Verifier agrees", text: "The independent verifier agrees with the leaning." },
  { id: "P6", name: "Stable", text: `The scorer gives the same leaning in all ${PUBLISH.runs} runs. The extra runs are made only when P1–P5 pass.` },
] as const;

export type PublishRuleId = (typeof PUBLISH_RULES)[number]["id"];

// ---------------------------------------------------------------------------
// Step 4: ideology rules (cards live in ideologies.ts).

export const IDEOLOGY_RULES = [
  { id: "I1", text: "Assign an ideology only when the claim explicitly matches one of its core beliefs, quoted as evidence, and none of its exclusions applies." },
  { id: "I2", text: "Never infer an ideology from the topic alone. For example, an abortion claim is Christian conservative only with religious framing, and Feminist only when argued as women's rights." },
  {
    id: "I3",
    text: `An ideology is published only when all of these hold: the matched belief is distinctive; the independent probability of the ideology is at least ${PUBLISH.minIdeology}; the independent probability that the claim takes a position is at least ${PUBLISH.minStance}; the ideology is usually found at the claim's leaning, when it has one; the verifier agrees; I6 passes; and all ${PUBLISH.runs} runs find it. Otherwise it is not published, and the reason is recorded.`,
  },
  { id: "I4", text: "At most two ideologies per claim." },
  { id: "I5", text: "When the independent check gives an ideology a probability of at least 0.8 that the scorer did not propose, the scorer takes a second look at that card. The ideology is added only if it then quotes a matching belief, and it still passes every other rule." },
  { id: "I6", text: `When a neighbouring ideology has an independent probability of ${PUBLISH.neighbour} or more, the scorer also takes a second look at it. If the claim matches one of the neighbour's beliefs too, the two cannot be told apart, so the ideology is published only if the neighbour is published as well.` },
] as const;
