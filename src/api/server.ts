import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { ScoringAgent, type ScoredClaim } from "../agent/v3/agent.js";
import { API_TOKEN } from "../config.js";
import { FRAMEWORK_VERSION } from "../framework/rubric.js";
import { fetchClaims, type Claim } from "../geo/claims.js";
import { GeoClient } from "../geo/client.js";
import { fetchTaxonomy, type Taxonomy } from "../geo/taxonomy.js";
import { RunState } from "../pipeline/state.js";
import { mapPool } from "../util/pool.js";

/** One claim to score: a Geo claim ID, or any sentence. */
export interface ScoreRequest {
  claimId?: string;
  text?: string;
}

/** The ideological leaning as the API reports it; `tenetText` and probabilities stay in `detail=full`. */
export interface LabelIdeology {
  name: string;
  kind: "tradition" | "issue";
  /** For an issue position, the issue it is a side of. */
  issue: string | null;
  tenet: string;
  evidence: string;
}

/** What the API answers for one claim. `detail=full` returns the whole ScoredClaim instead. */
export interface Label {
  claimId: string;
  text: string;
  /** "leaning": a leaning is published. "no_label", "no_position": nothing is. */
  outcome: ScoredClaim["outcome"];
  /** The published political position, or null. */
  leaning: string | null;
  /** Published ideological leanings (traditions and issue positions). */
  ideologies: LabelIdeology[];
  /** One line, e.g. "Right" or "No label (P4 Same level)". */
  display: string;
  /** Why, built by code from the numbers, rules and quotes. */
  explanation: string;
  noLabelReason: string | null;
  noPosition: ScoredClaim["noPosition"];
  hedged: boolean;
  country: string | null;
  framework: string;
  model: string;
}

/** What the API needs to answer: the agent, Geo lookups and the taxonomy it was built from. */
export interface ApiBackend {
  agent: Pick<ScoringAgent, "score" | "model">;
  claims(ids: string[]): Promise<Claim[]>;
  taxonomy: Taxonomy;
  close(): void;
}

export interface ApiOptions {
  /**
   * Opens the backend on the first request that needs it. A failure (no OpenAI credits, or Geo and the
   * framework out of sync) answers 503 and is retried on the next request, so a restart is not needed.
   */
  open?: () => Promise<ApiBackend>;
  /** When set, every request must send `Authorization: Bearer <token>`. Defaults to API_TOKEN. */
  token?: string | undefined;
  concurrency?: number;
  maxClaims?: number;
}

/** Caps, so one request cannot run the key dry or flood a prompt. */
const MAX_BODY_BYTES = 1_000_000;
const MAX_TEXT_LENGTH = 2_000;
const DEFAULT_MAX_CLAIMS = 25;
const DEFAULT_CONCURRENCY = 4;

const USAGE = {
  service: "POLARIS leanings agent",
  framework: FRAMEWORK_VERSION,
  endpoints: {
    "GET /health": "Readiness: framework, model, taxonomy fingerprint",
    "GET /taxonomy": "The Political position, Political ideology and Issue position values the agent may use",
    "GET /score?claimId=<id>": "Score one Geo claim (repeat the parameter for several)",
    "GET /score?text=<sentence>": "Score any sentence",
    "POST /score": 'Body: {"claimId":"<id>"} or {"text":"<sentence>"} or {"claims":[{...},{...}]}; add "detail":"full" for the whole result',
  },
  notes: ["Read-only: scoring never writes to Geo.", "Results are cached per claim, framework version and model."],
} as const;

/** An error whose status and message are meant for the caller. */
class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The same ID the CLI gives a sentence that is not on Geo, so its cached score is reused. */
function textClaimId(text: string): string {
  return `text-${createHash("sha256").update(text).digest("hex").slice(0, 16)}`;
}

function claimFromText(text: string): Claim {
  return { id: textClaimId(text), text, spaceIds: [], isFactual: null, context: {}, leaningIds: [] };
}

export function toLabel(scored: ScoredClaim, model: string): Label {
  return {
    claimId: scored.claimId,
    text: scored.text,
    outcome: scored.outcome,
    leaning: scored.leaning,
    ideologies: scored.ideologies.map((i) => ({ name: i.name, kind: i.kind, issue: i.issue, tenet: i.tenet, evidence: i.evidence })),
    display: scored.display,
    explanation: scored.explanation,
    noLabelReason: scored.noLabelReason,
    noPosition: scored.noPosition,
    hedged: scored.hedged,
    country: scored.country,
    framework: scored.versions.framework,
    model,
  };
}

/** Opens the real backend: one taxonomy fetch, one agent and one SQLite cache for the server's life. */
async function openBackend(): Promise<ApiBackend> {
  const geo = new GeoClient();
  const taxonomy = await fetchTaxonomy(geo);
  const state = new RunState();
  try {
    const agent = new ScoringAgent(taxonomy, state);
    return {
      agent,
      claims: (ids) => fetchClaims(geo, ids),
      taxonomy,
      close: () => state.close(),
    };
  } catch (error) {
    // The agent refuses to run when Geo and the framework disagree; don't leak the cache handle.
    state.close();
    throw error;
  }
}

/** Reads the request body as JSON, refusing anything over the cap. */
async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new ApiError(413, `Body is over ${MAX_BODY_BYTES} bytes`);
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks).toString("utf8").trim();
  if (!body) throw new ApiError(400, 'No body. Send {"claimId":"<id>"} or {"text":"<sentence>"}.');
  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError(400, "Body is not valid JSON");
  }
}

function asRequest(item: unknown, where: string): ScoreRequest {
  if (typeof item === "string") return item.trim().length === 32 && /^[0-9a-f]+$/.test(item.trim()) ? { claimId: item.trim() } : { text: item.trim() };
  if (!item || typeof item !== "object") throw new ApiError(400, `${where} must be an object with claimId or text`);
  const { claimId, text } = item as Record<string, unknown>;
  if (claimId !== undefined && typeof claimId !== "string") throw new ApiError(400, `${where}: claimId must be a string`);
  if (text !== undefined && typeof text !== "string") throw new ApiError(400, `${where}: text must be a string`);
  const id = claimId?.trim();
  const sentence = text?.trim();
  if (id && sentence) throw new ApiError(400, `${where}: give claimId or text, not both`);
  if (id) return { claimId: id };
  if (sentence) {
    if (sentence.length > MAX_TEXT_LENGTH) throw new ApiError(400, `${where}: text is over ${MAX_TEXT_LENGTH} characters`);
    return { text: sentence };
  }
  throw new ApiError(400, `${where}: give a claimId or a text`);
}

/** The accepted bodies: one claim, a list of claims, or a list of claim IDs. */
export function parseScoreBody(body: unknown): { requests: ScoreRequest[]; detail: "label" | "full"; batch: boolean } {
  if (Array.isArray(body)) return { requests: body.map((item, i) => asRequest(item, `claims[${i}]`)), detail: "label", batch: true };
  if (!body || typeof body !== "object") throw new ApiError(400, 'Body must be an object, e.g. {"text":"<sentence>"}');
  const { claims, claimIds, detail } = body as Record<string, unknown>;
  if (detail !== undefined && detail !== "label" && detail !== "full") throw new ApiError(400, 'detail must be "label" or "full"');
  const level = (detail ?? "label") as "label" | "full";
  if (claims !== undefined) {
    if (!Array.isArray(claims)) throw new ApiError(400, "claims must be an array");
    return { requests: claims.map((item, i) => asRequest(item, `claims[${i}]`)), detail: level, batch: true };
  }
  if (claimIds !== undefined) {
    if (!Array.isArray(claimIds)) throw new ApiError(400, "claimIds must be an array");
    return { requests: claimIds.map((id, i) => asRequest(id, `claimIds[${i}]`)), detail: level, batch: true };
  }
  return { requests: [asRequest(body, "body")], detail: level, batch: false };
}

/** The same for a query string: ?claimId=…&text=…&detail=full, each repeatable. */
export function parseScoreQuery(params: URLSearchParams): { requests: ScoreRequest[]; detail: "label" | "full"; batch: boolean } {
  const detail = params.get("detail") ?? "label";
  if (detail !== "label" && detail !== "full") throw new ApiError(400, 'detail must be "label" or "full"');
  const ids = params.getAll("claimId").concat(params.getAll("id"));
  const texts = params.getAll("text");
  const requests = [
    ...ids.map((id, i) => asRequest({ claimId: id }, `claimId[${i}]`)),
    ...texts.map((text, i) => asRequest({ text }, `text[${i}]`)),
  ];
  if (!requests.length) throw new ApiError(400, "Give ?claimId=<id> or ?text=<sentence>");
  return { requests, detail, batch: requests.length > 1 };
}

/**
 * The API: scoring over HTTP. One claim ID or sentence per request item; every answer carries the
 * framework version and model that produced it. Nothing here writes to Geo.
 */
export function createApi(options: ApiOptions = {}) {
  const open = options.open ?? openBackend;
  const token = options.token ?? API_TOKEN;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const maxClaims = options.maxClaims ?? DEFAULT_MAX_CLAIMS;
  let backend: ApiBackend | null = null;

  /** Opened once and kept; a failed attempt is not cached, so the next request tries again. */
  const backendOrFail = async (): Promise<ApiBackend> => {
    if (backend) return backend;
    try {
      backend = await open();
      return backend;
    } catch (error) {
      throw new ApiError(503, `The agent is not ready: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const score = async (requests: ScoreRequest[], detail: "label" | "full") => {
    if (!requests.length) throw new ApiError(400, "No claims given");
    if (requests.length > maxClaims) throw new ApiError(400, `At most ${maxClaims} claims per request, not ${requests.length}`);
    const ready = await backendOrFail();
    const ids = requests.map((r) => r.claimId).filter((id): id is string => Boolean(id));
    const found = new Map((ids.length ? await ready.claims([...new Set(ids)]) : []).map((claim) => [claim.id, claim]));

    return mapPool(requests, concurrency, async (request) => {
      const claim = request.claimId ? found.get(request.claimId) : claimFromText(request.text!);
      if (!claim) return { claimId: request.claimId!, error: "No claim with this ID on Geo" };
      if (!claim.text.trim()) return { claimId: claim.id, error: "The claim has no text" };
      try {
        const scored = await ready.agent.score(claim);
        return detail === "full" ? scored : toLabel(scored, ready.agent.model);
      } catch (error) {
        return { claimId: claim.id, error: error instanceof Error ? error.message : String(error) };
      }
    });
  };

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "OPTIONS") return send(res, 204, null);
    if (token && req.headers.authorization !== `Bearer ${token}`) throw new ApiError(401, "Send Authorization: Bearer <token>");

    if (path === "/" && req.method === "GET") return send(res, 200, USAGE);

    if (path === "/health") {
      if (req.method !== "GET") throw new ApiError(405, "Use GET /health");
      try {
        const ready = await backendOrFail();
        return send(res, 200, {
          ok: true,
          framework: FRAMEWORK_VERSION,
          model: ready.agent.model,
          taxonomy: {
            fingerprint: ready.taxonomy.fingerprint,
            politicalPositions: ready.taxonomy.politicalLeanings.length,
            politicalIdeologies: ready.taxonomy.ideologies.length,
            issuePositions: ready.taxonomy.issuePositions.length,
          },
        });
      } catch (error) {
        // Unready is a normal state to report, not a crash: say why, with the agent's own words.
        return send(res, 503, { ok: false, framework: FRAMEWORK_VERSION, error: error instanceof ApiError ? error.message : String(error) });
      }
    }

    if (path === "/taxonomy") {
      if (req.method !== "GET") throw new ApiError(405, "Use GET /taxonomy");
      const ready = await backendOrFail();
      const values = (list: Taxonomy["ideologies"]) => list.map((v) => ({ id: v.id, name: v.name }));
      return send(res, 200, {
        fingerprint: ready.taxonomy.fingerprint,
        politicalPositions: values(ready.taxonomy.politicalLeanings),
        politicalIdeologies: values(ready.taxonomy.ideologies),
        issuePositions: values(ready.taxonomy.issuePositions),
      });
    }

    if (path === "/score") {
      const parsed =
        req.method === "GET" ? parseScoreQuery(url.searchParams) : req.method === "POST" ? parseScoreBody(await readJson(req)) : null;
      if (!parsed) throw new ApiError(405, "Use GET /score?claimId=<id> or POST /score");
      const results = await score(parsed.requests, parsed.detail);
      // One claim in, one object out; a list in, a list out, each item a result or its own error.
      return send(res, 200, parsed.batch ? { count: results.length, results } : results[0]);
    }

    throw new ApiError(404, `Unknown path ${path}. GET / lists the endpoints.`);
  };

  const server: Server = createServer((req, res) => {
    handler(req, res).catch((error) => {
      const status = error instanceof ApiError ? error.status : 500;
      if (status === 500) console.error(`${req.method} ${req.url} failed:`, error);
      send(res, status, { error: error instanceof Error ? error.message : String(error) });
    });
  });

  return {
    server,
    handler,
    /** Closes the SQLite cache the backend holds; call after the server stops. */
    close: () => backend?.close(),
  };
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const headers: Record<string, string> = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  if (body === null) {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  const json = JSON.stringify(body, null, 2) + "\n";
  res.writeHead(status, { ...headers, "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(json) });
  res.end(json);
}

export interface ServeOptions extends ApiOptions {
  port?: number;
  host?: string;
}

/** Starts the API and resolves once it is listening. */
export async function serve(options: ServeOptions = {}): Promise<{ port: number; close: () => Promise<void> }> {
  const api = createApi(options);
  const port = options.port ?? 8787;
  const host = options.host ?? "127.0.0.1";
  await new Promise<void>((resolve, reject) => {
    api.server.once("error", reject);
    api.server.listen(port, host, resolve);
  });
  const address = api.server.address();
  const actual = typeof address === "object" && address ? address.port : port;
  return {
    port: actual,
    close: () =>
      new Promise<void>((resolve) => {
        api.server.close(() => {
          api.close();
          resolve();
        });
      }),
  };
}
