import "../util/quiet-sqlite-warning.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Classification } from "../agent/classify.js";
import type { Verification } from "../agent/verify.js";

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
    // busy_timeout first, so a second process waits for the lock instead of failing on the WAL switch.
    this.db.exec(`
      PRAGMA busy_timeout = 15000;
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
      CREATE TABLE IF NOT EXISTS cache (
        key        TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS verifications (
        claim_id         TEXT NOT NULL,
        model            TEXT NOT NULL,
        verifier_version TEXT NOT NULL,
        label_key        TEXT NOT NULL,
        result_json      TEXT NOT NULL,
        created_at       TEXT NOT NULL,
        PRIMARY KEY (claim_id, model, verifier_version, label_key)
      );
    `);
  }

  /** Generic cache for the v3 pipeline. Keys include the framework version and model, so a change invalidates them. */
  getCached<T>(key: string): T | undefined {
    const row = this.db.prepare(`SELECT value_json FROM cache WHERE key = ?`).get(key) as { value_json: string } | undefined;
    return row ? (JSON.parse(row.value_json) as T) : undefined;
  }

  putCached(key: string, value: unknown): void {
    this.db
      .prepare(`INSERT OR REPLACE INTO cache (key, value_json, created_at) VALUES (?, ?, ?)`)
      .run(key, JSON.stringify(value), new Date().toISOString());
  }

  /** Returns the cached value for `key`, computing and storing it on a miss. */
  async cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = this.getCached<T>(key);
    if (hit !== undefined) return hit;
    const value = await compute();
    this.putCached(key, value);
    return value;
  }

  getVerification(claimId: string, model: string, verifierVersion: string, labelKey: string): Verification | undefined {
    const row = this.db
      .prepare(
        `SELECT result_json FROM verifications
         WHERE claim_id = ? AND model = ? AND verifier_version = ? AND label_key = ?`,
      )
      .get(claimId, model, verifierVersion, labelKey) as { result_json: string } | undefined;
    return row ? (JSON.parse(row.result_json) as Verification) : undefined;
  }

  putVerification(result: Verification): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO verifications
         (claim_id, model, verifier_version, label_key, result_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(result.claimId, result.model, result.verifierVersion, result.labelKey, JSON.stringify(result), new Date().toISOString());
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
