// Keeps only some claims of an unsent proposal batch, without scoring again: the labels stay exactly as
// the dry run wrote them. Rewrites proposal.json, ops.json, proposal.csv and proposal.md.
// Usage: npx tsx scripts/trim-batch.mts proposals/<space>/batch-NN <ids.txt>
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeProposalFiles, type ProposalFile } from "../src/publish/files.js";

const [dir, idsFile] = process.argv.slice(2);
if (!dir || !idsFile) throw new Error("usage: trim-batch.mts <batch dir> <ids.txt>");
if (existsSync(join(dir, "submission.json"))) throw new Error(`${dir} was already submitted`);
const keep = readFileSync(idsFile, "utf8").split(/\r?\n/).map((l) => l.split("#")[0]!.trim()).filter(Boolean);

const manifest = JSON.parse(readFileSync(join(dir, "proposal.json"), "utf8")) as ProposalFile;
const missing = keep.filter((id) => !manifest.claims.some((c) => c.claimId === id));
if (missing.length) throw new Error(`Not in ${dir}: ${missing.join(", ")}`);
manifest.claims = keep.map((id) => manifest.claims.find((c) => c.claimId === id)!);
const ops = writeProposalFiles(dir, manifest, `Dry run, trimmed after review to ${manifest.claims.length} claims.`);
console.log(`${dir}: ${manifest.claims.length} claims, ${ops} Leanings links`);
