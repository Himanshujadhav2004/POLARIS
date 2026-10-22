import OpenAI from "openai";
import type { ReasoningEffort } from "openai/resources/shared";
import { OPENAI_MODEL, OPENAI_REASONING_EFFORT, requireEnv } from "../config.js";
import type { Claim } from "../geo/claims.js";
import type { Taxonomy } from "../geo/taxonomy.js";
import { buildSystemPrompt, buildUserMessage, PROMPT_VERSION } from "./prompt.js";
import { buildResponseSchema, resolveLabel, type Label } from "./schema.js";

export interface Usage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

export interface Classification {
  claimId: string;
  label: Label;
  valueIds: string[];
  abstained: boolean;
  /** The model name we asked for, e.g. "gpt-5.5". */
  model: string;
  /** The exact snapshot OpenAI served, e.g. "gpt-5.5-2026-04-23". */
  resolvedModel: string;
  promptVersion: string;
  taxonomyFingerprint: string;
  usage: Usage;
}

export class ClassificationError extends Error {
  override name = "ClassificationError";
}

export interface ClassifierOptions {
  model?: string;
  reasoningEffort?: string;
  client?: OpenAI;
}

export class Classifier {
  readonly model: string;
  private readonly reasoningEffort: ReasoningEffort | undefined;
  private readonly client: OpenAI;
  private readonly systemPrompt: string;
  private readonly responseSchema: Record<string, unknown>;

  constructor(
    private readonly taxonomy: Taxonomy,
    options: ClassifierOptions = {},
  ) {
    this.model = options.model ?? OPENAI_MODEL;
    this.reasoningEffort = (options.reasoningEffort ?? OPENAI_REASONING_EFFORT) as ReasoningEffort | undefined;
    this.client = options.client ?? new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY"), maxRetries: 5, timeout: 180_000 });
    this.systemPrompt = buildSystemPrompt(taxonomy);
    this.responseSchema = buildResponseSchema(taxonomy);
  }

  get taxonomyFingerprint(): string {
    return this.taxonomy.fingerprint;
  }

  /** Request body for one claim; also used to build Batch API files. */
  buildRequest(claim: Claim): OpenAI.Chat.ChatCompletionCreateParamsNonStreaming {
    return {
      model: this.model,
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: buildUserMessage(claim) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "leanings", strict: true, schema: this.responseSchema },
      },
      ...(this.reasoningEffort ? { reasoning_effort: this.reasoningEffort } : {}),
    };
  }

  async classify(claim: Claim): Promise<Classification> {
    if (!claim.text) throw new ClassificationError(`Claim ${claim.id} has no text`);
    const completion = await this.client.chat.completions.create(this.buildRequest(claim));
    return this.parseCompletion(claim.id, completion);
  }

  parseCompletion(claimId: string, completion: OpenAI.Chat.ChatCompletion): Classification {
    const choice = completion.choices[0];
    if (!choice) throw new ClassificationError(`No choices returned for claim ${claimId}`);
    if (choice.message.refusal) throw new ClassificationError(`Model refused claim ${claimId}: ${choice.message.refusal}`);
    if (choice.finish_reason !== "stop") {
      throw new ClassificationError(`Claim ${claimId} finished with "${choice.finish_reason}" instead of "stop"`);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(choice.message.content ?? "");
    } catch {
      throw new ClassificationError(`Claim ${claimId} returned invalid JSON`);
    }
    const resolved = resolveLabel(raw, this.taxonomy);
    const usage = completion.usage;
    return {
      claimId,
      ...resolved,
      model: this.model,
      resolvedModel: completion.model,
      promptVersion: PROMPT_VERSION,
      taxonomyFingerprint: this.taxonomy.fingerprint,
      usage: {
        inputTokens: usage?.prompt_tokens ?? 0,
        cachedInputTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
      },
    };
  }
}
