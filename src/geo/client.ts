import { GEO_API_URL } from "../config.js";

export class GeoQueryError extends Error {
  override name = "GeoQueryError";
}

class RetryableError extends Error {
  override name = "RetryableError";
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

export interface GeoClientOptions {
  url?: string;
  retries?: number;
  timeoutMs?: number;
}

/** Read-only client for the Geo GraphQL API. Retries timeouts, 429s and 5xx; GraphQL errors are not retried. */
export class GeoClient {
  private readonly url: string;
  private readonly retries: number;
  private readonly timeoutMs: number;

  constructor(options: GeoClientOptions = {}) {
    this.url = options.url ?? GEO_API_URL;
    this.retries = options.retries ?? 4;
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.send<T>(query, variables);
      } catch (err) {
        if (!isRetryable(err) || attempt >= this.retries) throw err;
        await sleep(Math.min(30_000, 1_000 * 2 ** attempt) + Math.random() * 500);
      }
    }
  }

  private async send<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "polaris-leanings/0.1" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (res.status === 429 || res.status >= 500) throw new RetryableError(`Geo API returned HTTP ${res.status}`);

    let body: GraphQLResponse<T>;
    try {
      body = (await res.json()) as GraphQLResponse<T>;
    } catch {
      // The API answers slow queries with an empty body instead of a status code.
      throw new RetryableError(`Geo API returned a non-JSON body (HTTP ${res.status})`);
    }
    if (body.errors?.length) throw new GeoQueryError(body.errors.map((e) => e.message).join("; "));
    if (!res.ok || body.data === undefined) throw new GeoQueryError(`Geo API returned HTTP ${res.status} without data`);
    return body.data;
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof RetryableError) return true;
  if (err instanceof GeoQueryError) return false;
  // fetch() network failures surface as TypeError; AbortSignal.timeout() as TimeoutError.
  return err instanceof TypeError || (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
