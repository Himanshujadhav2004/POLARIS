# Leanings

Date completed: October 23, 2026
Status: Done
Created by: Armando 
Created time: October 22, 2026 4:37 PM
Authors: Armando (https://app.notion.com/p/Armando-249273e214eb80eeba64ce3a491eb9af?pvs=21)

# Ontology

Verified against the live Geo graph on **26 October 2026** in **US Politics** (`4582fbbee28a16589154f7e36f1ee3c5`). “Live” describes indexed Geo data; “proposed” identifies changes that have not been published.

The model uses three distinct types and one shared relation property, **Leanings**, which already accepts all three types.

## Three distinct types

| Type | Scope | Examples | Live Geo ID | Live entities in US Politics |
| --- | --- | --- | --- | --- |
| Political position | Placement on the left–right political spectrum | Center left, Center, Right | [efa158a20ac34e63a31de1b103b1e7b0](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/efa158a20ac34e63a31de1b103b1e7b0) | 7 |
| Political ideology | A political tradition, worldview, or system of ideas | Marxist, Classical liberal, Socialist | [bdb20cbb75a644c2bc2aa4d14aeef883](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/bdb20cbb75a644c2bc2aa4d14aeef883) | 26 |
| Issue position | A stance on a particular issue or policy domain | Pro-gun control, Pro-life, Protectionist | [7391b5e238444157a49307884f6b93b4](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/7391b5e238444157a49307884f6b93b4) | 86 |

**Political position** is the current name of the former **Political leaning** type, with the same ID. **Political ideology** is the current name of the former **Ideology** type, also with the same ID. **Issue position** is already live; it no longer needs to be created.

### Political position

**Purpose:** Represent a broad location on the left–right spectrum. A specific policy preference or ideological tradition must be represented separately.

**Live description:** Describes the preferred ideas, values, and tendencies regarding how power, authority, and resources should be managed in society.

**Proposed replacement description:** Placement on the left–right political spectrum, reflecting a broad political orientation.

The live description still predates the narrower spectrum-only definition and should be updated.

**Live schema:** Topics and Tags, in addition to the standard identifying fields.

**Live values, ordered from left to right:** Far left, Left, Center left, Center, Center right, Right, Far right.

**Nonpartisan:** Still listed as proposed in the Notion spectrum table; it is not among these seven live values, and the name search returned no exact matching entity. Nonpartisanship concerns party alignment and does not establish a position at the center of the spectrum. Its treatment remains a separate modeling decision.

### Political ideology

**Purpose:** Represent a named tradition or system of political ideas. Names such as Conservative and Liberal refer here to traditions of thought; they are not substitutes for Right and Left.

**Live description:** A worldview about how society, the economy and government should be organized, named after its followers, such as libertarian or socialist.

**Proposed replacement description:** Political tradition or system of ideas about how society, the economy, and government should be organized.

The proposed wording defines the concept without requiring every entity to be named after its followers. Existing entity names remain unchanged.

**Live schema:** Foundational texts, Values, and Key thinkers.

**26 live entities:** Anarchist, Christian conservative, Classical liberal, Communist, Conservative, Democratic socialist, Environmentalist, Feminist, Globalist, Humanist, Islamist, Liberal, Libertarian, MAGA, Marxist, Nationalist, Neoconservative, Neoliberal, Paleoconservative, Populist, Progressive, Secularist, Social conservative, Social democrat, Socialist, Traditionalist.

**Scope qualifications:** MAGA represents a political movement and its associated ideas. Humanist denotes a broader philosophical worldview with political implications. Both are currently typed Political ideology in Geo; their inclusion does not make them equivalent in scope to a doctrine such as Marxism.

### Issue position

**Purpose:** Represent support, opposition, skepticism, or another stance concerning an issue or policy domain.

**Live description:** A side taken on one specific policy question, such as pro-life on abortion or protectionist on trade. Unlike Political position or Political ideology, it places an entity on a single issue rather than on a spectrum or worldview.

**Live schema:** Topics, Tags, and Slogan.

**86 entities are already published.** This includes [f446bcf6072247ecbbdf473fb4475a77](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/f446bcf6072247ecbbdf473fb4475a77) (Pro-gun control), [053a4341639d43a5b0d534b40f7efe4f](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/053a4341639d43a5b0d534b40f7efe4f) (Pro-life), and [a27f1e4a0a2248999ca1f07a2823ea12](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/a27f1e4a0a2248999ca1f07a2823ea12) (Isolationist).

Use **Topics** to link a position to its subject, such as Abortion or Gun control. The subject is a Topic; the stance is an Issue position. The 86 live entries currently have **no Topics relations in US Politics**, so this enrichment remains outstanding.

Positions are not required to form mutually exclusive pairs. For example, support for court reform can coexist with support for judicial independence, and support for vaccination does not establish support for mandates.

## Type properties

The following table records the live declared schemas. Shared properties are reused by ID.

| Property | ID | Data type | Target type | Declared on |
| --- | --- | --- | --- | --- |
| Topics | [806d52bc27e94c9193c057978b093351](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/806d52bc27e94c9193c057978b093351) | Relation | Topic | Political position; Issue position |
| Tags | [257090341ba5406f94e4d4af90042fba](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/257090341ba5406f94e4d4af90042fba) | Relation | Tag | Political position; Issue position |
| Foundational texts | [dbf977914e7646baaafde0227288078a](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/dbf977914e7646baaafde0227288078a) | Relation | No target-type restriction declared | Political ideology |
| Values | [81ff33dc1e3c4c0eae531f014113371c](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/81ff33dc1e3c4c0eae531f014113371c) | Relation | Value | Political ideology |
| Key thinkers | [b710528110f8477d843e460441aabca7](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/b710528110f8477d843e460441aabca7) | Relation | Person | Political ideology |
| Slogan | [df6dfb8db70b435a82c7a26c0192de2b](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/df6dfb8db70b435a82c7a26c0192de2b) | Text | — | Issue position |

**Usage:** Foundational texts identifies works articulating a tradition's core ideas; Values links its associated values; Key thinkers links people who developed or substantially shaped it. Topics links subject areas, while Tags provides lightweight labels.

**Slogans:** Five Issue position entities currently have a Slogan value. This is a record of published coverage, not a claim that those slogans are universally recognized or exclusive to those positions. Add slogans only when their wording and association are documented. Slogan is not currently declared on the Political ideology schema.

## Leanings relation

**ID:** [ff40a84705194415b30473badda2e534](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/ff40a84705194415b30473badda2e534)

**Data type:** Relation.

**Live target types:** Political position, Political ideology, and Issue position. All three target relations are already published.

**Live description:** The political positions and ideological traditions an entity identifies with or is associated with, such as center left or libertarian. Unlike Declared bias, it can hold both a place on the spectrum and a worldview.

**Proposed replacement description:** Political spectrum positions, ideological traditions, and issue-specific stances associated with an entity.

The live description omits issue-specific stances, although the live target configuration already includes Issue position.

**Current usage:** 0 Leanings relation instances in US Politics. No incoming Properties relations were found attaching Leanings to a type schema. Its planned use on Claim remains an implementation step.

**Classification rule:** Leanings may link to values from more than one of the three types when supported. A single issue position must not automatically determine a spectrum position or an ideology. Associations require evidence appropriate to the entity being classified.

### Other existing properties

Two separate properties also exist and must not be confused with the types or the shared Leanings relation:

- **Political position**, [cc53b1c458184690aafe49de93189810](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/cc53b1c458184690aafe49de93189810): a Text property, not the Political position type.
- **Ideology**, [7a4dc93633604580b33e9e1405fd8a4a](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/7a4dc93633604580b33e9e1405fd8a4a): a Relation property targeting Political ideology.

This document retains Leanings as the shared classification relation. It does not propose deleting or repurposing these other properties.

## Dataset reconciliation

The Notion reference contains **113 rows: 27 Political ideology and 86 Issue position**. Geo currently has **26 Political ideology and 86 Issue position entities in US Politics**.

The difference is **Libertarianism**, [23a5ddbd99c54fe1ad2c2c55d943f4fc](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/23a5ddbd99c54fe1ad2c2c55d943f4fc): it exists in Geo but is typed **Topic**, including in US Politics. It must not be counted as a live Political ideology entity. Its existing ID should be retained; any additional typing requires an explicit editorial decision. Its Geo entity was not modified during this review.

**Isolationist** is now typed Issue position, while **Social conservative** is live as Political ideology. These changes supersede the previous list of 27 live ideologies.

## Remaining changes

| Status | Item | Required action |
| --- | --- | --- |
| Complete in Geo | Three-type structure | Reuse the three live type IDs. No additional type creation is needed. |
| Complete in Geo | Leanings target types | All three target types are already configured. |
| Complete in Geo | Issue position publication | All 86 issue positions are live; remove the former proposal to create 84 entries. |
| Proposed | Type descriptions | Narrow Political position to the spectrum and simplify Political ideology as drafted above. |
| Proposed | Leanings description | Explicitly include issue-specific stances. |
| Outstanding | Issue-to-topic links | Populate Topics for the 86 Issue position entities using existing relevant Topic entities. |
| Planned | Classification integration | Attach Leanings to the intended Claim schema and implement evidence-based assignments. |
| Editorial decision | Libertarianism | Preserve the existing Topic; decide separately whether it also needs Political ideology typing. |
| Editorial decision | Nonpartisan | Resolve its off-spectrum meaning before assigning it a type or treating it as a spectrum value. |

# Ideological leanings

[Ideological leanings ](Ideological%20leanings%2088c2b63e7b8943439433445fd895ea70.csv)

# Political positions — spectrum

[Political leanings](Political%20leanings%200cff777dfaad424589cd754be29b2a8a.csv)