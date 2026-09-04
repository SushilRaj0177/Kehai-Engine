import Anthropic from "@anthropic-ai/sdk";
import { env, aiEnabled } from "../config/env.js";

/**
 * Thin provider abstraction. Every AI-touching service in this codebase
 * calls through here rather than importing the SDK directly — swapping
 * providers later (or adding a second one) means changing this file only.
 */

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!aiEnabled) throw new Error("AI provider not configured (ANTHROPIC_API_KEY missing)");
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
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
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: env.AI_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.inputSchema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: opts.toolName },
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) throw new Error("AI provider did not return a structured tool response");

  return opts.validate(toolUse.input);
}

export async function textCall(opts: { system: string; prompt: string; maxTokens?: number }): Promise<string> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: env.AI_MODEL,
    max_tokens: opts.maxTokens ?? 512,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return textBlock?.text ?? "";
}

export { aiEnabled };
