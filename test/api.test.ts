import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ScoredClaim } from "../src/agent/v3/agent.js";
import { parseScoreBody, serve, toLabel, type ApiBackend } from "../src/api/server.js";
import type { Claim } from "../src/geo/claims.js";
import { buildTaxonomy } from "../src/geo/taxonomy.js";

const claim = (id: string, text: string): Claim => ({ id, text, spaceIds: [], isFactual: null, context: {}, leaningIds: [] });

const scored = (claimId: string, text: string): ScoredClaim =>
  ({
    claimId,
    text,
    outcome: "leaning",
    leaning: "Left",
    candidateLeaning: "Left",
    display: "Left",
    noLabelReason: null,
    noPosition: null,
    checks: [],
    criteria: [],
    crossCutting: [],
    ideologies: [{ name: "Social democrat", kind: "tradition", issue: null, tenet: "T1", tenetText: "t", evidence: text, probability: 0.9 }],
    droppedIdeologies: [],
    explanation: "why",
    reviewerNotes: ["a note"],
    modelReasoning: "reasoning",
    country: "United States",
    hedged: false,
    flags: [],
    repeats: null,
    nearMisses: [],
    signals: { decisions: {}, verifier: null },
    versions: { framework: "framework-v3.5", scorer: "m", decisions: "d", verifier: "m" },
  }) as unknown as ScoredClaim;

/** A backend that answers from the stub instead of calling OpenAI or Geo. */
function stubBackend(onScore?: (claim: Claim) => void): ApiBackend {
  const taxonomy = buildTaxonomy(
    [{ id: "a".repeat(32), name: "Left", description: null }],
    [{ id: "b".repeat(32), name: "Social democrat", description: null }],
    [],
    new Set(),
  );
  return {
    agent: {
      model: "stub-model",
      score: async (c: Claim) => {
        onScore?.(c);
        if (c.text.includes("boom")) throw new Error("scorer failed");
        return scored(c.id, c.text);
      },
    },
    claims: async (ids) => ids.filter((id) => id !== "9".repeat(32)).map((id) => claim(id, "Congress should raise the minimum wage.")),
    taxonomy,
    close: () => {},
  };
}

let base: string;
let stop: () => Promise<void>;

beforeAll(async () => {
  const running = await serve({ port: 0, open: async () => stubBackend() });
  base = `http://127.0.0.1:${running.port}`;
  stop = running.close;
});

afterAll(async () => {
  await stop();
});

const post = (body: unknown, path = "/score") =>
  fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** The API answers JSON; tests read it loosely. */
const json = (res: Response): Promise<Record<string, any>> => res.json() as Promise<Record<string, any>>;

describe("POST /score", () => {
  it("labels a claim given its text", async () => {
    const res = await post({ text: "Congress should raise the minimum wage." });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.leaning).toBe("Left");
    expect(body.outcome).toBe("leaning");
    expect(body.ideologies).toEqual([{ name: "Social democrat", kind: "tradition", issue: null, tenet: "T1", evidence: "Congress should raise the minimum wage." }]);
    expect(body.model).toBe("stub-model");
    // The label view leaves out what a model wrote; only detail=full carries it.
    expect(body.modelReasoning).toBeUndefined();
  });

  it("labels a claim given its Geo ID", async () => {
    const id = "1".repeat(32);
    const body = await json(await post({ claimId: id }));
    expect(body.claimId).toBe(id);
    expect(body.leaning).toBe("Left");
  });

  it("gives the same ID to the same sentence, so its score is cached", async () => {
    const first = await json(await post({ text: "Taxes should be cut." }));
    const second = await json(await post({ text: "Taxes should be cut." }));
    expect(first.claimId).toBe(second.claimId);
    expect(first.claimId).toMatch(/^text-[0-9a-f]{16}$/);
  });

  it("returns the whole result with detail=full", async () => {
    const body = await json(await post({ text: "Congress should raise the minimum wage.", detail: "full" }));
    expect(body.modelReasoning).toBe("reasoning");
    expect(body.versions.framework).toBe("framework-v3.5");
  });

  it("answers a batch in order, with per-claim errors", async () => {
    const res = await post({ claims: [{ text: "Taxes should be cut." }, { claimId: "9".repeat(32) }, { text: "boom" }] });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.count).toBe(3);
    expect(body.results[0].leaning).toBe("Left");
    expect(body.results[1].error).toMatch(/No claim with this ID/);
    expect(body.results[2].error).toBe("scorer failed");
  });

  it("rejects a bad request with a reason", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ claimId: "x".repeat(32), text: "both" })).status).toBe(400);
    expect((await post({ claims: Array.from({ length: 26 }, () => ({ text: "x" })) })).status).toBe(400);
    expect(await json(await post({ text: "x".repeat(2001) }))).toMatchObject({ error: expect.stringContaining("over 2000") });
  });
});

describe("GET endpoints", () => {
  it("scores from the query string", async () => {
    const body = await json(await fetch(`${base}/score?text=Congress%20should%20raise%20the%20minimum%20wage.`));
    expect(body.leaning).toBe("Left");
  });

  it("treats repeated parameters as a batch", async () => {
    const body = await json(await fetch(`${base}/score?claimId=${"1".repeat(32)}&claimId=${"2".repeat(32)}`));
    expect(body.count).toBe(2);
  });

  it("reports health and the taxonomy", async () => {
    const health = await json(await fetch(`${base}/health`));
    expect(health).toMatchObject({ ok: true, model: "stub-model", framework: expect.stringContaining("framework-v") });
    const usage = await json(await fetch(`${base}/`));
    expect(usage.endpoints["POST /score"]).toContain("claimId");
    expect((await fetch(`${base}/taxonomy`)).status).toBe(200);
  });

  it("404s an unknown path", async () => {
    expect((await fetch(`${base}/nope`)).status).toBe(404);
  });
});

describe("when the agent cannot start", () => {
  it("answers 503 with the reason and retries on the next request", async () => {
    let attempts = 0;
    const running = await serve({
      port: 0,
      open: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("Ideology cards or leanings are out of sync with Geo");
        return stubBackend();
      },
    });
    const url = `http://127.0.0.1:${running.port}`;
    const first = await fetch(`${url}/health`);
    expect(first.status).toBe(503);
    expect(await json(first)).toMatchObject({ ok: false, error: expect.stringContaining("out of sync with Geo") });
    expect((await fetch(`${url}/health`)).status).toBe(200);
    await running.close();
  });
});

describe("token", () => {
  it("requires the bearer token when one is set", async () => {
    const running = await serve({ port: 0, token: "secret", open: async () => stubBackend() });
    const url = `http://127.0.0.1:${running.port}`;
    expect((await fetch(`${url}/health`)).status).toBe(401);
    expect((await fetch(`${url}/health`, { headers: { authorization: "Bearer secret" } })).status).toBe(200);
    await running.close();
  });
});

describe("parsing and shaping", () => {
  it("reads every accepted body", () => {
    expect(parseScoreBody({ text: "a" })).toMatchObject({ batch: false, requests: [{ text: "a" }] });
    expect(parseScoreBody({ claimIds: ["a".repeat(32)] })).toMatchObject({ batch: true });
    expect(parseScoreBody([{ text: "a" }, "b".repeat(32)])).toMatchObject({ batch: true, requests: [{ text: "a" }, { claimId: "b".repeat(32) }] });
  });

  it("keeps the published label and drops unverified model text", () => {
    const label = toLabel(scored("c", "t"), "m");
    expect(Object.keys(label)).not.toContain("reviewerNotes");
    expect(label.leaning).toBe("Left");
    expect(label.explanation).toBe("why");
  });
});
