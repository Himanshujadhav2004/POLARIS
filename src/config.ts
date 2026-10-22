import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const GEO_API_URL = process.env.GEO_API_URL ?? "https://api-testnet.geobrowser.io/graphql";
export const GEO_WEB_URL = "https://www.geobrowser.io";

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.5";
export const OPENAI_REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || undefined;

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set. Add it to .env (see .env.example).`);
  return value;
}

/** Spaces in scope. `slug` is used in file names and CLI flags. */
export const SPACES = [
  { slug: "us-politics", name: "US Politics", id: "4582fbbee28a16589154f7e36f1ee3c5" },
  { slug: "health", name: "Health", id: "52c7ae149838b6d47ce0f3b2a5974546" },
  { slug: "crypto", name: "Crypto", id: "c9f267dcb0d270718c2a3c45a64afd32" },
  { slug: "ai", name: "AI", id: "41e851610e13a19441c4d980f2f2ce6b" },
  { slug: "world-affairs", name: "World affairs", id: "89bd89bf28ff8a0963faf92a8c905e20" },
  { slug: "podcasts", name: "Podcasts", id: "b5a31f8182b042437ede0f84ee02f104" },
  { slug: "relationships", name: "Relationships", id: "224406e0de3c48d78ef12774111b8b2f" },
] as const;

export type Space = (typeof SPACES)[number];

export function spaceBySlug(slug: string): Space {
  const space = SPACES.find((s) => s.slug === slug);
  if (!space) throw new Error(`Unknown space "${slug}". Known: ${SPACES.map((s) => s.slug).join(", ")}`);
  return space;
}

export const IDS = {
  claimType: "96f859efa1ca4b229372c86ad58b694b",
  leaningsProperty: "ff40a84705194415b30473badda2e534",
  politicalLeaningType: "efa158a20ac34e63a31de1b103b1e7b0",
  ideologyType: "bdb20cbb75a644c2bc2aa4d14aeef883",
  typesProperty: "8f151ba4de204e3c9cb499ddf96f48f1",
} as const;

/**
 * Taxonomy values the agent must never output.
 * "Libertarian" duplicates "Libertarianism", which the team chose as canonical.
 */
export const EXCLUDED_VALUE_IDS: ReadonlySet<string> = new Set(["f69a3a6e8ac14423aad8a9361dd7258a"]);

export function geoEntityUrl(spaceId: string, entityId: string): string {
  return `${GEO_WEB_URL}/space/${spaceId}/${entityId}`;
}
