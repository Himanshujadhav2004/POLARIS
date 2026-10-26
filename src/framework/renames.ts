/**
 * Sides Geo renamed when it split Leanings into three types (2026-10-26), old name → Geo name. Same
 * entity and ID; several now mean something narrower, so the old alternative names are dropped.
 * Kept apart from ideologies.ts so scripts/sync-geo-leanings.mts can load it before the cards are valid.
 */
export const RENAMED_ON_GEO: Readonly<Record<string, string>> = {
  Deaccelerationist: "Decelerationist",
  "Pro-trade": "Free trader",
  "Pro-wage flexibility": "Pro-market wages",
  "Pro-Taiwan independance": "Pro-Taiwan defense",
  "Pro-Taiwan reunification": "Pro-Taiwan restraint",
  Transatlanticist: "Pro-NATO",
  "Pro-USAID": "Pro-foreign aid",
  "Tax fairness": "Progressive taxation",
  "Pro-energy production": "Pro-fossil fuels",
  "Pro-fiscal responsibility": "Fiscal hawk",
  "Pro-Russia": "Ukraine aid skeptic",
  "Anti-legalization": "Prohibitionist",
  "Pro-national security": "Pro-surveillance",
};
