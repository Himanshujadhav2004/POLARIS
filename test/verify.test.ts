import type OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { FrameworkVerifier, type ProposedResult } from "../src/agent/v3/verify.js";
import type { Claim } from "../src/geo/claims.js";

const claim: Claim = { id: "c1", text: "Abortion should be banned", spaceIds: [], isFactual: null, context: {}, leaningIds: [] };
const proposed: ProposedResult = {
  leaning: "Right",
  criteria: [{ id: "SOC-2R", text: "", evidence: "Abortion should be banned" }],
  ideologies: [
    { name: "Pro-life", belief: "", evidence: "Abortion should be banned" },
    { name: "Christian conservative", belief: "", evidence: "Abortion should be banned" },
  ],
};

const verifierAnswering = (content: string) => {
  const client = {
    chat: { completions: { create: async () => ({ choices: [{ message: { content, refusal: null }, finish_reason: "stop" }] }) } },
  } as unknown as OpenAI;
  return new FrameworkVerifier(client, "stub");
};

describe("FrameworkVerifier.verify", () => {
  it("counts a leaning named twice as disagreed when either entry objects", async () => {
    const v = await verifierAnswering(
      JSON.stringify({
        leaning: { verdict: "agree", problems: "" },
        ideologies: [
          { name: "Pro-life", verdict: "agree", problems: "" },
          { name: "Christian conservative", verdict: "agree", problems: "" },
          { name: "Christian conservative", verdict: "disagree", problems: "no religious element" },
        ],
      }),
    ).verify(claim, proposed);
    expect(v.ideologies).toEqual([
      { name: "Pro-life", verdict: "agree", problems: "" },
      { name: "Christian conservative", verdict: "disagree", problems: "no religious element" },
    ]);
  });

  it("treats a leaning or ideology it did not assess as not approved", async () => {
    const v = await verifierAnswering(JSON.stringify({ leaning: { verdict: "not_applicable", problems: "" }, ideologies: [{ name: "Pro-life", verdict: "agree", problems: "" }] })).verify(
      claim,
      proposed,
    );
    expect(v.leaning).toBeNull();
    expect(v.ideologies[1]).toEqual({ name: "Christian conservative", verdict: "disagree", problems: "the verifier did not assess it" });
  });

  it("fails loudly on an answer that is not the expected JSON", async () => {
    await expect(verifierAnswering("not json").verify(claim, proposed)).rejects.toThrow();
    await expect(verifierAnswering(JSON.stringify({ leaning: { verdict: "maybe", problems: "" }, ideologies: [] })).verify(claim, proposed)).rejects.toThrow();
  });
});
