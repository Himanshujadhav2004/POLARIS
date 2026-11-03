# Leanings

Authors: Armando (https://app.notion.com/p/Armando-249273e214eb80eeba64ce3a491eb9af?pvs=21)
Created by: Armando 
Created time: October 22, 2026 4:37 PM
Date completed: October 23, 2026
Last edited by: Armando 
Last edited time: October 27, 2026 5:52 AM
Status: Done

# Ontology

## Three classification types and their doctrines

| Type | Scope | Examples | Live Geo ID | Live entities in US Politics |
| --- | --- | --- | --- | --- |
| Political position | Placement on the left–right spectrum | Center left, Center, Right | [efa158a20ac34e63a31de1b103b1e7b0](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/efa158a20ac34e63a31de1b103b1e7b0) | 7 |
| Issue position | Stance on an issue or policy domain | Pro-gun control, Pro-life, Protectionist | [7391b5e238444157a49307884f6b93b4](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/7391b5e238444157a49307884f6b93b4) | 86 |
| Ideological leaning | Orientation associated with an ideological tradition | Communist, Marxist, Conservative | [bdb20cbb75a644c2bc2aa4d14aeef883](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/bdb20cbb75a644c2bc2aa4d14aeef883) | 26 |
| Political ideology | The doctrine, tradition, or body of political ideas itself | Communism, Marxism, Conservatism | [6855ece4c99f405587890b3b1956aee2](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/6855ece4c99f405587890b3b1956aee2) | 26 |

### Political position

Placement on the left–right political spectrum.

**Properties:** Topics, Tags.

**Values:** Far left, Left, Center left, Center, Center right, Right, Far right.

### Ideological leaning

An orientation associated with an ideological tradition, applicable to ideas, content, organizations, movements, and people.

**Properties:** Topics, Tags, Ideology.

### Political ideology

A political tradition or system of ideas about how power, society, and the economy should be organized.

**Properties:** Foundational texts, Values, Key thinkers, Leanings.

**Example:** [Communist](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/a461ba2edccf4c06842cead379d80519) (Ideological leaning) → **Ideology** → [Communism](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/d04940d8c40441afaf2c7cd164add2de) (Political ideology).

### Issue position

A stance on a particular public issue or policy question.

**Properties:** Topics, Tags, Slogan.

**Examples:** [Pro-gun control](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/f446bcf6072247ecbbdf473fb4475a77), [Pro-life](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/053a4341639d43a5b0d534b40f7efe4f), [Isolationist](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/a27f1e4a0a2248999ca1f07a2823ea12).

**Topics** links each stance to its subject, such as Abortion or Gun control.

## Type properties

The following table records the live declared schemas. Shared properties are reused by ID.

| Property | ID | Data type | Target type | Declared on |
| --- | --- | --- | --- | --- |
| Topics | [806d52bc27e94c9193c057978b093351](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/806d52bc27e94c9193c057978b093351) | Relation | Topic | Political position; Ideological leaning; Issue position |
| Tags | [257090341ba5406f94e4d4af90042fba](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/257090341ba5406f94e4d4af90042fba) | Relation | Tag | Political position; Ideological leaning; Issue position |
| Foundational texts | [dbf977914e7646baaafde0227288078a](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/dbf977914e7646baaafde0227288078a) | Relation | No target-type restriction declared | Political ideology |
| Values | [81ff33dc1e3c4c0eae531f014113371c](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/81ff33dc1e3c4c0eae531f014113371c) | Relation | Value | Political ideology |
| Key thinkers | [b710528110f8477d843e460441aabca7](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/b710528110f8477d843e460441aabca7) | Relation | Person | Political ideology |
| Ideology | [7a4dc93633604580b33e9e1405fd8a4a](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/7a4dc93633604580b33e9e1405fd8a4a) | Relation | Political ideology | Ideological leaning |
| Leanings | [ff40a84705194415b30473badda2e534](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/ff40a84705194415b30473badda2e534) | Relation | Political position; Ideological leaning; Issue position | Political ideology |
| Slogan | [df6dfb8db70b435a82c7a26c0192de2b](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/df6dfb8db70b435a82c7a26c0192de2b) | Text | — | Issue position |

**Usage:** Foundational texts identifies works articulating a tradition's core ideas; Values links its associated values; Key thinkers links people who developed or substantially shaped it. Topics links subject areas, while Tags provides lightweight labels.

## Ideology relation

**ID:** [7a4dc93633604580b33e9e1405fd8a4a](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/7a4dc93633604580b33e9e1405fd8a4a)

Links an **Ideological leaning** to its associated **Political ideology**.

## Leanings relation

**ID:** [ff40a84705194415b30473badda2e534](https://www.geobrowser.io/space/4582fbbee28a16589154f7e36f1ee3c5/ff40a84705194415b30473badda2e534)

Associates an entity with **Political positions**, **Ideological leanings**, and **Issue positions**.

# Ideological leanings

[Ideological leanings ](Ideological%20leanings%2088c2b63e7b8943439433445fd895ea70.csv)

# Political positions — spectrum

[Political leanings](Political%20leanings%200cff777dfaad424589cd754be29b2a8a.csv)