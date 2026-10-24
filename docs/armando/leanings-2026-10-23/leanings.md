# Leanings

Date completed: October 23, 2026
Status: Done
Created by: Armando 
Created time: October 22, 2026 4:37 PM
Authors: Armando (https://app.notion.com/p/Armando-249273e214eb80eeba64ce3a491eb9af?pvs=21)

# Ontology

Space: US Politics (`4582fbbee28a16589154f7e36f1ee3c5`). Live = read from Geo on 2026-10-22. Proposed = not on Geo yet.

Two types, **Political leaning** and **Ideology**, and one property, **Leanings**, that points to both. No other type is created.

## Types

### Political leaning — `efa158a20ac34e63a31de1b103b1e7b0` (Live)

**Description (live since 2026-10-22):** Describes the preferred ideas, values, and tendencies regarding how power, authority, and resources should be managed in society.

| Property | ID | Data type | Points to | Description |
| --- | --- | --- | --- | --- |
| Topics | `806d52bc27e94c9193c057978b093351` | Relation | Topic | Topics connected to this entity. For issue leanings: the issue (Abortion, Immigration…). |
| Tags | `257090341ba5406f94e4d4af90042fba` | Relation | Tag | (none) |

**Political leanings (type Political leaning):**

- Spectrum, 7 live: Far left, Left, Center left, Center, Center right, Right, Far right. Proposed: Nonpartisan. See the Political leanings table below.
- Issue leanings, 84 proposed: Pro-life, Pro-choice, Protectionist, Climate skeptic… one pair per issue, each linked to its issue with Topics. See the issue leanings table below.

### Ideology — `bdb20cbb75a644c2bc2aa4d14aeef883` (Live)

**Description:** A worldview about how society, the economy and government should be organized, named after its followers, such as libertarian or socialist. Unlike Political leaning, it names a tradition of ideas rather than a place on the left-right spectrum.

| Property | ID | Data type | Points to | Description |
| --- | --- | --- | --- | --- |
| Foundational texts | `dbf977914e7646baaafde0227288078a` | Relation | (any) | The written works that establish or articulate the core ideas of something. These serve as primary references for its principles and development. |
| Values | `81ff33dc1e3c4c0eae531f014113371c` | Relation | Value | A set of values that are held |
| Key thinkers | `b710528110f8477d843e460441aabca7` | Relation | Person | The individuals who developed, shaped, or significantly advanced something. This identifies those whose ideas form its intellectual foundation. |

**Ideologies (27 live, type Ideology):** Anarchist, Christian conservative, Classical liberal, Communist, Conservative, Democratic socialist, Environmentalist, Feminist, Globalist, Humanist, Islamist, Isolationist, Liberal, Libertarian, Libertarianism (pre-existing, untouched), MAGA, Marxist, Nationalist, Neoconservative, Neoliberal, Paleoconservative, Populist, Progressive, Secularist, Social democrat, Socialist, Traditionalist.

## Properties

| Property | ID | Data type | Points to | Used on | Description |
| --- | --- | --- | --- | --- | --- |
| Leanings | `ff40a84705194415b30473badda2e534` | Relation | Political leaning, Ideology | Not on any type schema yet, 0 uses. Planned on Claims (Leanings agent) | The political positions and ideological traditions an entity identifies with or is associated with, such as center left or libertarian. Unlike Declared bias, it can hold both a place on the spectrum and a worldview. |

## Changes this proposal would make

| Op | Target | Detail |
| --- | --- | --- |
| Create entities | 84 political leanings (issue leanings) | Approved rows of the issue leanings table, typed Political leaning, each with a 2-sentence description and Topics → its issue |
| Create entity | Nonpartisan | New political leaning |

No schema change on Leanings: it already points to Political leaning and Ideology.

# Ideological leanings

[Ideological leanings ](Ideological%20leanings%2088c2b63e7b8943439433445fd895ea70.csv)

# Political leanings — spectrum

[Political leanings](Political%20leanings%200cff777dfaad424589cd754be29b2a8a.csv)