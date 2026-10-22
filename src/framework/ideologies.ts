import type { LeaningName } from "./rubric.js";

export interface Tenet {
  id: string;
  text: string;
  /** True when this belief belongs to this ideology alone; shared beliefs give at most "Potential". */
  distinctive: boolean;
}

export interface IdeologyCard {
  name: string;
  geoId: string;
  definition: string;
  /** Where the definition comes from, and whether Armando has approved it. */
  source: string;
  status: "Draft" | "Approved";
  tenets: Tenet[];
  exclusions: string[];
  neighbours: string[];
  /** Leanings this ideology is usually found at; a result outside them is flagged for review. */
  typicalLeanings: LeaningName[];
}

const ALL: LeaningName[] = ["Far left", "Left", "Center left", "Center", "Center right", "Right", "Far right"];
const GEO = "Geo Ideology description (draft until Armando approves)";

const card = (
  name: string,
  geoId: string,
  definition: string,
  tenets: [string, boolean][],
  exclusions: string[],
  neighbours: string[],
  typicalLeanings: LeaningName[],
  source = GEO,
): IdeologyCard => ({
  name,
  geoId,
  definition,
  source,
  status: "Draft",
  tenets: tenets.map(([text, distinctive], i) => ({ id: `T${i + 1}`, text, distinctive })),
  exclusions,
  neighbours,
  typicalLeanings,
});

export const IDEOLOGY_CARDS: IdeologyCard[] = [
  card("Anarchist", "c3a9c4dcbb6d473ab8e0deda7b893914",
    "An outlook that rejects the state and other coercive hierarchies, favoring voluntary cooperation and self-organized communities. Most currents sit on the far left, while anarcho-capitalists apply the same distrust of the state to free markets.",
    [["Abolish the state, or replace it with voluntary, self-organized communities.", true], ["Reject coercive hierarchies such as police, prisons or bosses in favour of mutual aid.", false]],
    ["Calls to shrink or reform government while keeping it."],
    ["Communist", "Marxist", "Libertarianism"], ["Far left", "Left", "Right"]),
  card("Christian conservative", "c11e061c625b442c9f1a1ebea357f2e3",
    "An outlook that brings Christian moral teaching into politics, notably on abortion, marriage, religious liberty and education. In the US it forms a core constituency of the Republican right, often called the religious right.",
    [["Grounds a political position explicitly in Christian faith or morality.", true], ["Restricts abortion, defends traditional marriage or religious liberty, argued on religious grounds.", false]],
    ["The same positions without religious framing (use Conservative or Traditionalist, or no ideology)."],
    ["Traditionalist", "Conservative", "Paleoconservative"], ["Center right", "Right", "Far right"]),
  card("Classical liberal", "c42000dc8f0643e4ae2b3e792c55ca39",
    "An outlook rooted in individual rights, the rule of law, limited government and free markets, as framed by thinkers such as Locke and Adam Smith. It is the common ancestor of modern liberals and libertarians.",
    [["Limits government power to protect individual rights, explicitly as a matter of liberty.", false], ["Free markets with limited government, framed as protecting individual liberty.", false], ["Invokes the classical-liberal tradition of limited, constitutional government (Locke, Smith, natural rights).", true]],
    ["General support for free speech or the rule of law (shared across the mainstream; see G4)."],
    ["Libertarianism", "Liberal", "Neoliberal", "Conservative"], ["Center left", "Center", "Center right", "Right"]),
  card("Communist", "a461ba2edccf4c06842cead379d80519",
    "An outlook that aims for a classless society in which property is held in common and the state eventually withers away. In practice it has meant one-party states with planned economies, at the far left.",
    [["Common ownership of property and the means of production, toward a classless society.", true], ["Revolution or one-party rule to achieve it.", true]],
    ["Reforms within a market economy, however large."],
    ["Marxist", "Socialist", "Anarchist"], ["Far left"]),
  card("Conservative", "4e93d425a84e40d1a2403263de57a847",
    "An outlook that values tradition, limited government, free enterprise and established social and moral norms, preferring gradual change over rupture. It anchors the center right and the right, though its priorities vary widely between countries.",
    [["Preserve established institutions and norms; prefer gradual change over rupture.", false], ["Combines limited government and free enterprise with traditional social norms.", true]],
    ["A single economic policy (such as a tax cut) on its own: give a leaning, not an ideology."],
    ["Traditionalist", "Christian conservative", "Paleoconservative", "Neoconservative", "Classical liberal"], ["Center right", "Right"]),
  card("Democratic socialist", "d892d9b32bf644359676bf0bf2299c60",
    "An outlook that seeks social ownership of key industries and a strong welfare state, reached through elections and democratic institutions rather than revolution. In US politics it stands to the left of mainstream liberals.",
    [["Social ownership of key industries or services, reached through democratic means.", true], ["Universal public provision (single-payer healthcare, free college) as a step beyond the welfare state.", false]],
    ["Revolution or one-party rule (Communist)."],
    ["Socialist", "Social democrat", "Progressive"], ["Left", "Far left"]),
  card("Environmentalist", "fc34ee62e0a843779741a251140c546b",
    "An outlook that puts protecting ecosystems and the climate at the center of politics, often demanding limits on growth, pollution and fossil fuels. Green parties carry it, mostly on the left of the spectrum.",
    [["Puts protecting ecosystems or the climate ahead of competing economic goals.", true], ["Limits on pollution, fossil fuels or growth.", false]],
    ["An environmental benefit mentioned only in passing."],
    ["Progressive"], ["Far left", "Left", "Center left", "Center"]),
  card("Feminist", "5f90b6eaac214ef0911195d9c56983e9",
    "An outlook that seeks equal political, economic and social rights for women and challenges gender-based discrimination. Its currents range from liberal to radical, so feminists appear across the spectrum, most often on the left.",
    [["Explicitly seeks equal rights or status for women, or challenges gender-based discrimination.", true], ["Argues reproductive or bodily autonomy as a matter of women's rights.", false]],
    ["An abortion or family claim not argued in terms of women's equality or rights."],
    ["Progressive", "Liberal"], ["Far left", "Left", "Center left", "Center"]),
  card("Globalist", "bae9b302e5eb4ac3a67951f1131abd1e",
    "An outlook that favors international cooperation, open trade, migration and strong global institutions to address shared problems. Critics also use the label pejoratively for elites accused of putting world interests ahead of national ones.",
    [["Gives international institutions authority over national governments, or argues for global governance as such.", true], ["More international cooperation, open trade or migration as a global good.", false]],
    ["A narrow bilateral deal or foreign investment in one project.", "Use only when the claim itself argues for international governance; the term is often used pejoratively."],
    ["Neoliberal", "Liberal"], ["Center left", "Center", "Center right"]),
  card("Humanist", "855d0e3058bb4fe0956d723e7f0b0321",
    "A worldview that grounds ethics and politics in reason, human dignity and shared welfare rather than religious authority. It cuts across the left-right spectrum, so its followers can sit anywhere from the left to the center right.",
    [["Grounds ethics or policy explicitly in reason and human dignity rather than religious authority.", true]],
    ["General humanitarian concern without that grounding."],
    ["Secularist"], ["Left", "Center left", "Center", "Center right"]),
  card("Islamist", "e7abad19f4f34f6c8eab79b2825987f9",
    "An outlook that wants Islamic law and principles to shape government and public life. Its currents range from parties working through elections to armed movements, and it is distinct from the Muslim faith itself.",
    [["Islamic law or principles should shape government, law or public life.", true]],
    ["Claims about Muslims' rights or religious freedom."],
    [], ["Right", "Far right"]),
  card("Isolationist", "a27f1e4a0a2248999ca1f07a2823ea12",
    "An outlook that wants a country to stay out of foreign wars, alliances and entanglements and to focus on domestic affairs. It has appeared on both the left and the right of American politics.",
    [["Stay out of foreign wars, alliances or entanglements as a general rule.", true], ["Put domestic affairs ahead of foreign commitments.", false]],
    ["Opposition to one specific intervention argued on its own merits."],
    ["Paleoconservative", "MAGA", "Populist"], ALL),
  card("Liberal", "1c3fd766f3ec4617b40fcd1d08a4feec",
    "An outlook built on civil liberties, individual rights and an active state that reduces inequality through gradual reform within existing institutions. In the US the label means center left, while elsewhere it often signals free-market positions.",
    [["Gradual reform within existing institutions to reduce inequality or expand rights.", false], ["Civil liberties and individual rights protected by an active state.", false]],
    ["A single policy position: Liberal is broad and has no distinctive belief, so it is never published from one claim alone."],
    ["Progressive", "Social democrat", "Classical liberal", "Neoliberal"], ["Left", "Center left", "Center"]),
  card("Libertarianism", "23a5ddbd99c54fe1ad2c2c55d943f4fc",
    "An outlook that puts individual liberty first and wants minimal government in both economic and personal life, from taxes to drug policy. It pairs free-market economics with socially liberal stances, so it fits poorly on a single left-right axis.",
    [["Minimal government in both economic and personal life, argued together.", true], ["Oppose state restrictions on personal choices (drugs, speech, guns) as a matter of individual liberty.", false], ["Free markets with minimal taxation and regulation, argued as liberty.", false]],
    ["Deregulation argued for growth rather than liberty (see Neoliberal)."],
    ["Classical liberal", "Anarchist", "Neoliberal"], ALL,
    "Geo description of the duplicate value Libertarian; Libertarianism has none in Geo (draft until Armando approves)"),
  card("MAGA", "f62bcc598efb4ce89fabd3c34dd77c92",
    "The political movement behind Donald Trump's Make America Great Again agenda, combining nationalism, America First trade and foreign policy, restrictive immigration and hostility to established institutions. It has been the dominant current on the Republican right since 2016.",
    [["Explicitly invokes Trump, America First or Make America Great Again.", true], ["Combines restrictive immigration, America First trade and hostility to established institutions.", false]],
    ["A single restrictive policy without MAGA framing: give a leaning, or Nationalist with national-identity framing."],
    ["Paleoconservative", "Nationalist", "Populist"], ["Right", "Far right"]),
  card("Marxist", "5b7e92e968fa4ef19d7945bcdb3fa0d6",
    "An outlook that reads history and politics through class struggle and the critique of capitalism developed by Karl Marx. It shapes communist, socialist and academic currents alike, mostly on the far left and the left.",
    [["Explains politics through class struggle or a critique of capitalism as exploitation.", true]],
    ["Inequality concerns without class analysis."],
    ["Communist", "Socialist"], ["Far left", "Left"]),
  card("Nationalist", "949d526009a5476b809b0ab9795907aa",
    "An outlook that puts the interests, identity and sovereignty of the nation first, often skeptical of immigration and international institutions. It can appear on the left in independence movements, but today mostly sits on the right.",
    [["Puts the nation's interests, identity or sovereignty first, explicitly over international bodies or outsiders.", true], ["Restricts immigration to protect national identity.", false]],
    ["A state's official position in a territorial dispute (see G4).", "Border management without national-identity framing."],
    ["MAGA", "Paleoconservative", "Populist"], ["Center right", "Right", "Far right", "Left"]),
  card("Neoconservative", "a0ff6257cfd8440dab75663a8ed90265",
    "An outlook that pairs conservative domestic views with an assertive foreign policy, using American power to spread democracy and confront rivals. It shaped Republican foreign policy in the 2000s and sits on the center right.",
    [["Uses national power assertively abroad to spread democracy or confront rivals.", true]],
    ["Defensive aid or deterrence alone."],
    ["Conservative"], ["Center right", "Right"]),
  card("Neoliberal", "d18bda990d0f41f1a8620255d0590011",
    "An outlook that favors free markets, deregulation, privatization, open trade and fiscal restraint as the engine of growth. It shaped center-left and center-right governments alike from the 1980s onward, so it crosses party lines.",
    [["Free markets, deregulation, privatization and open trade as the general engine of growth, not one sector's rules.", true], ["Fiscal restraint.", false], ["Cutting the regulations of one sector or project to spur growth.", false]],
    ["Deregulation argued as individual liberty (see Libertarianism)."],
    ["Classical liberal", "Libertarianism", "Conservative", "Globalist"], ["Center left", "Center", "Center right", "Right"]),
  card("Paleoconservative", "fcb006f0fa2c43e480f154fe37979abc",
    "An outlook that defends tradition, national sovereignty and restricted immigration while opposing foreign interventions and free-trade deals. It predates MAGA but shares much of its program and sits on the right.",
    [["Combines tradition, national sovereignty and restricted immigration with opposition to foreign intervention or free trade.", true]],
    ["Any one of these positions on its own."],
    ["MAGA", "Traditionalist", "Isolationist", "Nationalist"], ["Right", "Far right"]),
  card("Populist", "e6cb2a73c4dd46bc8ecb8680638c6b89",
    "An outlook that frames politics as a struggle between ordinary people and a corrupt elite, and claims to speak for the people directly. It attaches to both left and right programs, so populists appear at both ends.",
    [["Frames politics as ordinary people against a corrupt elite.", true]],
    ["Criticism of a specific official or company without people-versus-elite framing."],
    ["MAGA", "Nationalist", "Progressive"], ALL),
  card("Progressive", "8cf9e9560faf46ff8c127036168c3163",
    "An outlook that seeks deep structural change to reduce economic inequality, advance racial justice and act on climate, rather than incremental reform. In US politics it sits on the left, beyond mainstream liberals.",
    [["Deep structural change to reduce economic inequality, advance racial justice or act on climate, beyond incremental reform.", true], ["Expand rights and protections for marginalized groups.", false]],
    ["Incremental reform within existing programs (see Liberal)."],
    ["Liberal", "Democratic socialist", "Social democrat", "Environmentalist"], ["Left", "Center left"]),
  card("Secularist", "b2727c4b6d2243cbb3b5161f33535568",
    "An outlook that wants religion kept separate from the state, with laws and public institutions grounded in non-religious reasoning. It defends freedom of belief for all and appears across the spectrum, more often on the left.",
    [["Keep religion separate from the state, law or public institutions.", true]],
    ["Defending one group's religious freedom."],
    ["Humanist", "Liberal"], ["Left", "Center left", "Center", "Center right"]),
  card("Social democrat", "196f3d425aee453eaf6625540dd1faec",
    "An outlook that keeps a market economy but tames it with a large welfare state, strong unions and progressive taxation. It accepts capitalism and reforms it from within, which places it on the center left.",
    [["Explicitly pairs keeping a market economy with a larger welfare state or stronger unions.", true], ["Higher taxes on the wealthy or on corporations to fund public services or welfare.", false], ["Worker representation and strong labour rights within firms.", false]],
    ["Social ownership of industries (see Democratic socialist or Socialist)."],
    ["Democratic socialist", "Liberal", "Progressive"], ["Center left", "Left"]),
  card("Socialist", "a050df4dc2414b3fabbb538483eea93a",
    "An outlook that wants the means of production and key services owned or tightly steered by the public, to end class inequality. It ranges from gradual reformers to revolutionaries and sits firmly on the left.",
    [["Public ownership or tight public control of the means of production or key services, to end class inequality.", true], ["Legal limits on private wealth to achieve economic equality.", false]],
    ["Welfare expansion within a market economy (see Social democrat)."],
    ["Democratic socialist", "Communist", "Marxist", "Social democrat"], ["Far left", "Left"]),
  card("Traditionalist", "350419395b25466eb84a26746a74873e",
    "An outlook that sees inherited customs, religion and social institutions as the foundation of a good society and distrusts rapid change. It underpins several conservative currents and sits on the right.",
    [["Inherited customs, religion or traditional institutions (family, gender roles) as the foundation of society.", true], ["Distrust of rapid social change.", false]],
    ["Nostalgia without a claim about how society should be ordered."],
    ["Conservative", "Christian conservative", "Paleoconservative"], ["Center right", "Right", "Far right"]),
];
// Fascist and Zionist were deleted from Geo on 2026-10-22 (US Politics proposal
// "Update Political leaning description, delete Fascist and Zionist"), so they have no cards.

export const CARD_BY_NAME: ReadonlyMap<string, IdeologyCard> = new Map(IDEOLOGY_CARDS.map((c) => [c.name, c]));
