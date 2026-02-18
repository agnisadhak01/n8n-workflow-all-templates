/**
 * Use case description generator from template title, description, and tags.
 * Rule-based template first; optional AI enhancement for complex cases.
 */

import type { DescriptionInput } from "./types.js";
import { getNodeTypeDisplayName } from "./node-analyzer.js";

function extractFirstSentence(text: string | null, maxLen: number): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  const dot = trimmed.indexOf(".");
  const first = dot >= 0 ? trimmed.slice(0, dot + 1) : trimmed.slice(0, maxLen);
  return first.slice(0, maxLen).trim();
}

function extractKeyNodes(nodeTypes: string[], limit: number): string[] {
  const skip = new Set([
    "n8n-nodes-base.stickyNote",
    "n8n-nodes-base.noOp",
  ]);
  const names = nodeTypes
    .filter((t) => !skip.has(t))
    .slice(0, limit)
    .map(getNodeTypeDisplayName);
  return [...new Set(names)];
}

/**
 * Generate a short use case description using rule-based template.
 */
export function generateDescriptionRuleBased(input: DescriptionInput): string {
  const { title, description, tags, nodeTypes, category } = input;
  const firstSentence = extractFirstSentence(description, 200);
  const keyNodes = extractKeyNodes(nodeTypes, 5);
  const nodePhrase =
    keyNodes.length > 0
      ? ` using ${keyNodes.join(", ")}`
      : "";
  const tagPhrase =
    Array.isArray(tags) && tags.length > 0
      ? ` (tags: ${tags.slice(0, 5).join(", ")})`
      : "";
  const categoryPhrase = category ? ` Category: ${category}.` : "";

  if (firstSentence) {
    return `${firstSentence}${categoryPhrase} This workflow${nodePhrase} supports use cases${tagPhrase}.`.slice(0, 500);
  }

  return `This workflow automates "${title}"${nodePhrase}.${categoryPhrase}${tagPhrase}`.slice(
    0,
    500
  );
}

/**
 * Call OpenAI to generate a 2–3 sentence business-focused use case description.
 * Returns null if no key or request fails.
 */
export async function generateDescriptionWithAI(
  input: DescriptionInput,
  openaiApiKey: string
): Promise<string | null> {
  const { title, description, tags, nodeTypes, category } = input;
  const keyNodes = extractKeyNodes(nodeTypes, 8);

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You write short, business-focused use case descriptions (2-3 sentences, under 400 characters). No markdown, no bullet points. Output plain text only.",
      },
      {
        role: "user",
        content: `Write a use case description for this n8n workflow.\nTitle: ${title}\nDescription excerpt: ${(description || "").slice(0, 600)}\nTags: ${(tags || []).join(", ")}\nCategory: ${category || "General"}\nKey nodes: ${keyNodes.join(", ")}\n\nOutput 2-3 sentences describing what business use case this workflow enables.`,
      },
    ],
    max_tokens: 200,
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content ? content.slice(0, 500) : null;
  } catch {
    return null;
  }
}

/**
 * Generate use case description: rule-based always; AI-enhanced when useAI and apiKey are set.
 */
export async function generateUseCaseDescription(
  input: DescriptionInput,
  options: { useAI?: boolean; openaiApiKey?: string } = {}
): Promise<string> {
  const ruleBased = generateDescriptionRuleBased(input);
  if (options.useAI && options.openaiApiKey) {
    const aiDesc = await generateDescriptionWithAI(input, options.openaiApiKey);
    if (aiDesc) return aiDesc;
  }
  return ruleBased;
}
