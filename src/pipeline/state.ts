import "../util/quiet-sqlite-warning.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Classification } from "../agent/classify.js";

export const DEFAULT_STATE_PATH = "data/state.sqlite";

/**
 * Local run state. Every classification is stored once per (claim, model, prompt version,
 * taxonomy fingerprint), so re-running a command never pays for the same claim twice.
 */
export class RunState {
  private readonly db: DatabaseSync;

  constructor(path = DEFAULT_STATE_PATH) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS classifications (
        claim_id             TEXT NOT NULL,
        model                TEXT NOT NULL,
        prompt_version       TEXT NOT NULL,
        taxonomy_fingerprint TEXT NOT NULL,
        space_id             TEXT,
        result_json          TEXT NOT NULL,
        created_at           TEXT NOT NULL,
        PRIMARY KEY (claim_id, model, prompt_version, taxonomy_fingerprint)
      );
    `);
  }

  get(claimId: string, model: string, promptVersion: string, fingerprint: string): Classification | undefined {
    const row = this.db
      .prepare(
        `SELECT result_json FROM classifications
         WHERE claim_id = ? AND model = ? AND prompt_version = ? AND taxonomy_fingerprint = ?`,
      )
      .get(claimId, model, promptVersion, fingerprint) as { result_json: string } | undefined;
    return row ? (JSON.parse(row.result_json) as Classification) : undefined;
  }

  put(result: Classification, spaceId: string | null): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO classifications
         (claim_id, model, prompt_version, taxonomy_fingerprint, space_id, result_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        result.claimId,
        result.model,
        result.promptVersion,
        result.taxonomyFingerprint,
        spaceId,
        JSON.stringify(result),
        new Date().toISOString(),
      );
  }

  close(): void {
    this.db.close();
  }
}
