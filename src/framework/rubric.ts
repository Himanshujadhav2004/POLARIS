/**
 * The scoring framework: the written criteria every classification must cite.
 * The prompt and docs/FRAMEWORK.md are generated from this file, so a rule change here
 * changes the agent. Bump FRAMEWORK_VERSION with every change.
 */
export const FRAMEWORK_VERSION = "framework-v3.1";

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
 * Political leaning values that are not on the left-right scale. Armando's doc proposes
 * Nonpartisan for entities that claim no side (wire services, fact-checkers, courts); a claim
 * that takes a position is never Nonpartisan, so the agent never outputs these.
 */
export const OFF_SCALE_LEANINGS: readonly string[] = ["Nonpartisan"];

/**
 * What each level means, shared word for word by the scorer, the independent check and the
 * verifier, so all three place claims on the same scale. Follows Armando's Political leanings
 * table: Left is "Liberal (US usage)", Right is "Conservative (US usage)", Center left and right
 * are "lean" or "moderate" positions.
 */
export const LEVEL_RULES: Record<LeaningName, string> = {
  "Far left": "Radical: replaces capitalism or seeks systemic, often revolutionary change; abolishes core institutions such as police, prisons or borders.",
  Left: "The mainstream liberal or progressive position (in the US, what liberals and Democrats typically support), for example higher taxes on the wealthy, protecting abortion access, a path to citizenship, gun-safety laws or climate action, including bold plans such as single-payer healthcare.",
  "Center left": "A moderate, lean-left position: a modest or incremental step in a liberal direction, or a left-leaning position with explicit centrist limits.",
  Center: "Explicitly combines or balances a left and a right position as a compromise, with no consistent tilt.",
  "Center right": "A moderate, lean-right position: a modest or incremental step in a conservative direction, or a right-leaning position with explicit centrist limits.",
  Right: "The mainstream conservative position (in the US, what conservatives and Republicans typically support), for example lower taxes, stricter immigration enforcement and deportation, abortion restrictions, gun rights or voter ID, including bold plans such as abolishing a federal department.",
  "Far right": "Ultranationalist, nativist or hostile to pluralist institutions: removes rights from people because of ethnicity, religion or sexuality, imposes religious rule, or ends elections or civil liberties for opponents.",
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
/** The Leanings property, from Armando's doc. It holds one political leaning and any ideological leanings. */
export const LEANINGS_PROPERTY_DEFINITION =
  "The political positions and ideological traditions an entity identifies with or is associated with, such as center left or libertarian. Unlike Declared bias, it can hold both a place on the spectrum and a worldview.";

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
      c("ECO", -3, "Replace or abolish market capitalism: nationalize the economy, abolish private ownership of major industries, cap income or wealth by law, expropriate, or overthrow capitalism.", ["There should be a maximum legal income", "All major industries should be nationalized"]),
      c("ECO", -2, "The mainstream liberal or progressive economic position: higher taxes on high earners or corporations, a wealth tax, expanding public programs and the safety net, raising the minimum wage, universal or single-payer healthcare, tuition-free college, student debt relief, stronger unions, consumer and financial regulation.", ["The minimum wage should be raised", "Congress should raise taxes on high earners", "Student loan debt should be forgiven"]),
      c("ECO", -1, "A moderate, lean-left economic step with explicit centrist limits: targeted or means-tested help, modest expansions of existing programs, fixing rather than replacing a program, market-friendly regulation.", ["The Affordable Care Act should be improved rather than replaced", "The child tax credit should be expanded for low-income working families only"]),
      c("ECO", 0, "Explicitly argues for a balance or compromise between market and state, rejecting both expansion and reduction as such.", ["The debate should focus on the right balance of financial rules, not eliminating them entirely"]),
      c("ECO", 1, "A moderate, lean-right economic step with explicit centrist limits: modest or targeted tax relief, spending restraint that protects core programs, targeted deregulation, market reforms within existing programs.", ["The Affordable Care Act should let insurers sell cheaper basic plans", "Small businesses should get targeted tax relief"]),
      c("ECO", 2, "The mainstream conservative economic position: lower taxes, spending and deficit cuts, deregulation, school choice, limits on union power, work requirements for welfare, opposition to minimum-wage increases, including bold plans such as abolishing federal departments or agencies, a flat tax, or privatizing Social Security.", ["Taxes should be cut", "Raising the minimum wage kills jobs", "The Department of Education should be abolished"]),
    ],
  },
  {
    id: "SOC",
    name: "Social and cultural values",
    covers: "Abortion, LGBTQ rights, gender roles and family, religion in public life, race and identity, drugs and personal morality, school curricula.",
    criteria: [
      c("SOC", -3, "Abolish core social institutions such as marriage or the family, or suppress religion in private life.", ["Marriage should be abolished as a legal institution"]),
      c("SOC", -2, "The mainstream liberal or progressive social position: protect or expand abortion access, LGBTQ and transgender rights, same-sex marriage, anti-discrimination and DEI measures, secular public institutions, legal marijuana, including bold plans such as decriminalizing all drugs or reparations.", ["Abortion should be legal", "Same-sex marriage should be legal nationwide", "Religious schools should not receive public money"]),
      c("SOC", -1, "A moderate, lean-left social position with explicit centrist limits, for example abortion legal up to viability, or decriminalizing marijuana without legalizing it.", ["Abortion should be legal up to fetal viability"]),
      c("SOC", 0, "Explicitly argues for a compromise between socially liberal and socially conservative positions.", ["Abortion should be legal early in pregnancy and restricted later"]),
      c("SOC", 1, "A moderate, lean-right social position with explicit centrist limits, for example limits on late-term abortion with broad exceptions, or religious accommodations that keep anti-discrimination law.", ["Late-term abortion should be restricted, with exceptions for the health of the mother and fetal anomalies"]),
      c("SOC", 2, "The mainstream conservative social position: abortion restrictions or bans, traditional marriage and family, parental rights in education, limits on gender-transition care for minors, religious-liberty exemptions, opposition to DEI, including bold plans such as reversing same-sex marriage or ending no-fault divorce.", ["Abortion is murder", "Gender-affirming care for minors should be banned", "Marriage is the best foundation for raising children"]),
      c("SOC", 3, "Remove civil rights from people because of race, religion or sexuality, criminalize homosexuality, or impose religious rule.", ["Homosexuality should be criminalized"]),
    ],
  },
  {
    id: "NAT",
    name: "Immigration, citizenship and national identity",
    covers: "Immigration levels and enforcement, refugees and asylum, citizenship, national identity and belonging.",
    criteria: [
      c("NAT", -3, "Abolish national borders or all immigration control.", ["National borders should be abolished"]),
      c("NAT", -2, "The mainstream liberal or progressive immigration position: a path to citizenship, protection for refugees and asylum seekers, limits on enforcement, immigration as a benefit, including bold plans such as abolishing ICE or ending deportations.", ["Undocumented immigrants should have a path to citizenship", "ICE should be abolished"]),
      c("NAT", -1, "A moderate, lean-left immigration step with explicit centrist limits, for example legal status for a narrow group, or due process alongside border control.", ["Dreamers brought to the US as children should be allowed to stay"]),
      c("NAT", 0, "Explicitly pairs stronger enforcement with legal pathways as a compromise.", ["Immigration reform should pair stronger border security with a path to citizenship"]),
      c("NAT", 1, "A moderate, lean-right immigration step with explicit centrist limits, for example more border agents alongside legal immigration, or deporting only people convicted of serious crimes.", ["Only immigrants convicted of violent crimes should be deported"]),
      c("NAT", 2, "The mainstream conservative immigration position: stronger border enforcement, deporting people in the country illegally, lower immigration, ending sanctuary policies, including bold plans such as mass deportation, ending birthright citizenship or an immigration moratorium.", ["All illegal aliens should be deported", "Birthright citizenship should be ended"]),
      c("NAT", 3, "Exclude or remove people because of ethnicity or religion, or strip citizenship from groups.", ["Muslims should be barred from entering the country"]),
    ],
  },
  {
    id: "LAW",
    name: "Law, justice, guns and elections",
    covers: "Policing, courts and sentencing, guns, the death penalty, voting rules and electoral institutions.",
    criteria: [
      c("LAW", -3, "Abolish the police or prisons.", ["Police departments should be abolished"]),
      c("LAW", -2, "The mainstream liberal or progressive position: gun-safety laws (universal background checks, assault-weapon bans), police accountability, criminal-justice reform, ending cash bail, abolishing the death penalty, wider voting access, abolishing the Electoral College, including bold plans such as defunding the police or mandatory gun buybacks.", ["Universal background checks should be required for every gun sale", "The death penalty should be abolished"]),
      c("LAW", -1, "A moderate, lean-left step with explicit centrist limits, for example a narrow gun measure such as red-flag laws while protecting gun ownership, or police reform paired with funding.", ["Red-flag laws should let courts remove guns from people in crisis, without other new gun restrictions"]),
      c("LAW", 0, "Explicitly balances public safety and civil liberties as a compromise.", ["Police should get more funding and stronger accountability rules"]),
      c("LAW", 1, "A moderate, lean-right step with explicit centrist limits, for example voter ID with free IDs provided, or tougher sentences for one specific violent crime.", ["Voter ID should be required, with free IDs for everyone who needs one"]),
      c("LAW", 2, "The mainstream conservative position: gun rights, tougher sentencing, more police funding, the death penalty, voter ID and election-security rules, limits on mail-in voting, including bold plans such as repealing most gun laws or using the military for domestic policing.", ["The right to own a gun is a fundamental human right", "Mail-in voting should be abolished"]),
      c("LAW", 3, "Suspend elections or civil liberties for opponents, rule by decree, or endorse political violence.", ["The president should be able to suspend elections during a crisis"]),
    ],
  },
  {
    id: "ENV",
    name: "Environment and energy",
    covers: "Climate policy, pollution, conservation, fossil fuels and renewable energy.",
    criteria: [
      c("ENV", -3, "Abandon economic growth or the market economy to protect the climate.", ["Economic growth should be abandoned to save the climate"]),
      c("ENV", -2, "The mainstream liberal or progressive climate position: climate regulation, emission limits, carbon pricing, clean-energy subsidies, rejoining climate agreements, conservation, including bold plans such as banning new fossil-fuel projects.", ["Climate change is an existential threat that requires urgent government action", "All new oil and gas drilling should be banned"]),
      c("ENV", -1, "A moderate, lean-left step with explicit centrist limits, for example clean-energy incentives without mandates.", ["Clean energy should get tax incentives, but no fossil fuel should be banned"]),
      c("ENV", 0, "Explicitly supports an all-of-the-above energy compromise.", ["The US should expand both renewables and natural gas"]),
      c("ENV", 1, "A moderate, lean-right step with explicit centrist limits, for example faster permitting for every kind of energy, or market-based conservation.", ["Permitting should be faster for both pipelines and wind farms"]),
      c("ENV", 2, "The mainstream conservative energy position: expand domestic oil and gas, cut climate regulations, leave climate agreements, put energy costs ahead of climate rules, including bold plans such as abolishing the EPA.", ["The US should drill for more oil and gas", "The EPA should be abolished"]),
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
  { id: "C1", name: "Country context", text: "Place a position relative to the mainstream politics of the country or region the claim is about. The examples are from the United States. If placement depends on a country the claim does not make clear, no leaning is given." },
  { id: "E1", name: "Evidence", text: "Every criterion and ideology must quote the exact words from the claim that match it. Context (topics, tags, sources, related claims) can help read the claim but is never evidence." },
  { id: "H1", name: "Hedged wording", text: 'If the claim is hedged or descriptive ("can", "may", "might", "tends to", "often", "in some cases"), every topic-area score is capped at Center left or Center right (±1).' },
  { id: "A1", name: "Mixed signals", text: "If one topic area scores left (−1 or lower) and another scores right (+1 or higher), no leaning is given (mixed signals), never Center." },
  { id: "A2", name: "Combining topic areas", text: "When all scored topic areas point the same way, the leaning is their average, rounded toward the center." },
  { id: "A3", name: "Center", text: "Center is given only when a Center criterion (…-0) matches. A claim with no scored topic area gets no leaning (cross-cutting)." },
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
  /** Issue leanings: minimum independent probability of the side the claim takes. */
  minIssue: 0.9,
  /** Issue leanings: maximum independent probability of any other side of the same issue. */
  maxOtherSide: 0.1,
  /** Traditions: minimum independent probability that the claim's position is characteristic. */
  minTradition: 0.8,
  /** Ideological leanings per claim (a claim has at most one political leaning). */
  maxIdeologies: 5,
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
  {
    id: "I1",
    text: "Issue leanings: assign one when the claim itself takes that side of its issue, quoting the claim's words. Taking another side, only mentioning the issue, or reporting someone else's side never counts.",
  },
  {
    id: "I2",
    text: "Traditions (Armando's convention): assign one when the position the claim takes is characteristic of it, meaning its adherents typically hold that position, even if the claim does not name the tradition or its reasons. The topic alone never counts: the claim's actual position must be characteristic, and the card's exclusions apply.",
  },
  {
    id: "I3",
    text: `An ideological leaning is published only when all of these hold: its evidence is quoted word for word; the independent probability that the claim takes a position is at least ${PUBLISH.minStance}; for an issue leaning, its independent probability is at least ${PUBLISH.minIssue} and every other side of the issue is at most ${PUBLISH.maxOtherSide}; for a tradition, its independent probability is at least ${PUBLISH.minTradition} and, when the claim has a leaning, the tradition is usually found there; the verifier agrees; and all ${PUBLISH.runs} runs find it. Otherwise it is not published, and the reason is recorded.`,
  },
  { id: "I4", text: `A claim has at most one political leaning but can have several ideological leanings, up to ${PUBLISH.maxIdeologies}.` },
  {
    id: "I5",
    text: "When the independent check gives an ideological leaning a probability of at least 0.8 that the scorer did not propose, the scorer takes a second look at that card. The leaning is added only if it then quotes the claim's words, and it still passes every other rule.",
  },
] as const;
