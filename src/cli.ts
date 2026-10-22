import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { SPACES, spaceBySlug } from "./config.js";
import { countClaims, fetchClaims, sampleClaimIds } from "./geo/claims.js";
import { GeoClient } from "./geo/client.js";
import { fetchSchema } from "./geo/schema.js";
import { fetchTaxonomy } from "./geo/taxonomy.js";
import { seededRng } from "./util/random.js";

const HELP = `Usage: npm run cli -- <command> [options]

Geo (read-only, no key needed)
  schema                       Save the live Geo GraphQL schema to schema/geo-schema.json
  taxonomy                     List the Political leaning and Ideology values the agent may use
  counts                       Count claims in each target space
  claim <id> [<id>...]         Show claims with the context the agent sees
  sample <space> [--count N] [--seed N]
                               Draw random claims from a space (slugs: ${SPACES.map((s) => s.slug).join(", ")})
`;

async function main(argv: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      count: { type: "string" },
      seed: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, ...rest] = positionals;
  const geo = new GeoClient();

  switch (values.help ? undefined : command) {
    case "schema": {
      mkdirSync("schema", { recursive: true });
      writeFileSync("schema/geo-schema.json", JSON.stringify(await fetchSchema(geo), null, 1) + "\n");
      console.log("Saved schema/geo-schema.json");
      return;
    }
    case "taxonomy": {
      const taxonomy = await fetchTaxonomy(geo);
      console.log(`Fingerprint ${taxonomy.fingerprint}\n`);
      console.log(`Political leaning (${taxonomy.politicalLeanings.length})`);
      for (const v of taxonomy.politicalLeanings) console.log(`  ${v.id}  ${v.name}`);
      console.log(`\nIdeology (${taxonomy.ideologies.length})`);
      for (const v of taxonomy.ideologies) console.log(`  ${v.id}  ${v.name}`);
      return;
    }
    case "counts": {
      let total = 0;
      for (const space of SPACES) {
        const n = await countClaims(geo, space.id);
        total += n;
        console.log(`${space.name.padEnd(15)} ${n.toLocaleString("en-US").padStart(9)}`);
      }
      console.log(`${"Total".padEnd(15)} ${total.toLocaleString("en-US").padStart(9)}`);
      return;
    }
    case "claim": {
      if (!rest.length) throw new Error("Give at least one claim ID.");
      console.log(JSON.stringify(await fetchClaims(geo, rest), null, 2));
      return;
    }
    case "sample": {
      const space = spaceBySlug(rest[0] ?? "");
      const count = Number(values.count ?? 10);
      const seed = Number(values.seed ?? Date.now() % 2 ** 31);
      const ids = await sampleClaimIds(geo, space.id, count, seededRng(seed));
      console.log(`${space.name}: ${ids.length} random claims (seed ${seed})\n`);
      for (const claim of await fetchClaims(geo, ids)) console.log(`  ${claim.id}  ${claim.text}`);
      return;
    }
    default:
      console.log(HELP);
  }
}

main(process.argv.slice(2)).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
