import Groq from "groq-sdk";
import { env, aiEnabled } from "../config/env.js";

/**
 * Thin provider abstraction. Every AI-touching service in this codebase
 * calls through here rather than importing the SDK directly — swapping
 * providers later (or adding a second one) means changing this file only.
 *
 * Uses Groq (an OpenAI-compatible chat completions API) — free tier, no
 * credit card required. Structured output is implemented the same way as
 * OpenAI-style function calling: a forced tool call.
 */

let client: Groq | null = null;
function getClient(): Groq {
  if (!aiEnabled) throw new Error("AI provider not configured (GROQ_API_KEY missing)");
  client ??= new Groq({ apiKey: env.GROQ_API_KEY });
  return client;
}

export interface StructuredCallOptions<T> {
  system: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
  validate: (raw: unknown) => T;
}

/**
 * Forces the model to respond through a single tool call matching
 * `inputSchema`, so callers get validated structured JSON rather than
 * free text they have to parse and hope is well-formed. This is how we
 * keep the LLM out of the business of doing arithmetic or inventing its
 * own response shape.
 */
export async function structuredCall<T>(opts: StructuredCallOptions<T>): Promise<T> {
  const groq = getClient();

  const response = await groq.chat.completions.create({
    model: env.AI_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: opts.toolName,
          description: opts.toolDescription,
          parameters: opts.inputSchema,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: opts.toolName } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("AI provider did not return a structured tool response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error("AI provider returned malformed JSON in its tool call arguments");
  }

  return opts.validate(parsed);
}

export async function textCall(opts: { system: string; prompt: string; maxTokens?: number }): Promise<string> {
  const groq = getClient();
  const response = await groq.chat.completions.create({
    model: env.AI_MODEL,
    max_tokens: opts.maxTokens ?? 512,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

export { aiEnabled };
