/**
 * Serviceable name generator: creates a plain-English name (~15–25 chars)
 * that a non-technical person can understand (rule-based + optional AI).
 */

export interface ServiceableNameInput {
  title: string;
  useCaseDescription: string | null;
  useCaseName: string | null;
  nodeTypes: string[];
}

const MAX_CHARS = 25;

/** Never truncate mid-word. Returns a complete name within maxChars, or fallback if impossible. */
function truncateAtWordBoundary(s: string, maxChars: number, fallback: string): string {
  const t = s.trim();
  if (t.length <= maxChars) return t;
  const idx = t.lastIndexOf(" ", maxChars);
  if (idx <= 0) return fallback;
  const trimmed = t.slice(0, idx).trim();
  if (trimmed.length < 2) return fallback;
  return trimmed;
}

/**
 * Rule-based fallback: derive a short name from use_case_name or use_case_description (primary inputs), then title.
 * Only includes complete words; never truncates mid-word.
 */
export function generateServiceableNameRuleBased(input: ServiceableNameInput): string {
  const text =
    (input.useCaseName && input.useCaseName.trim()) ||
    (input.useCaseDescription && input.useCaseDescription.trim()) ||
    input.title ||
    "Workflow automation";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Workflow";
  if (words[0].length > MAX_CHARS) return "Workflow";
  let result = words[0];
  for (let i = 1; i < words.length && result.length + 1 + words[i].length <= MAX_CHARS; i++) {
    result += " " + words[i];
  }
  return truncateAtWordBoundary(result, MAX_CHARS, "Workflow");
}

/**
 * Call OpenAI to generate a plain-English name (~15–25 chars) a non-technical person would understand.
 * Returns null if no key or request fails.
 */
export async function generateServiceableNameWithAI(
  input: ServiceableNameInput,
  apiKey: string
): Promise<string | null> {
  const useCaseName = (input.useCaseName || "").trim();
  const useCaseDesc = (input.useCaseDescription || "").trim().slice(0, 600);
  const nodeSummary =
    input.nodeTypes.length > 0
      ? input.nodeTypes.slice(0, 10).join(", ")
      : "general automation";

  const parts: string[] = [];
  if (useCaseName) parts.push(`Use case: ${useCaseName}`);
  if (useCaseDesc) parts.push(`Description: ${useCaseDesc}`);
  const primary = parts.join("\n") || "No use case data.";
  const context = `Title: ${input.title || "—"}\nNodes: ${nodeSummary}`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Output a short plain-English name for an n8n workflow (~15–25 chars). If the use case name is already clear and non-technical, use it as-is. Otherwise base it on use case and description. No jargon. Always output a complete name—never truncate or cut words mid-way. Output only the name, e.g. 'Stripe Payment Sync' or 'Sync Stripe to Sheets'.",
      },
      {
        role: "user",
        content: `${primary}\n\n${context}`,
      },
    ],
    max_tokens: 40,
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    const cleaned = content.replace(/^["']|["']$/g, "").trim();
    if (cleaned.length <= MAX_CHARS) return cleaned;
    const complete = truncateAtWordBoundary(cleaned, MAX_CHARS, "");
    return complete || null;
  } catch {
    return null;
  }
}

/**
 * Generate serviceable name: rule-based always; AI when useAI and apiKey are set.
 */
export async function generateServiceableName(
  input: ServiceableNameInput,
  options: { useAI?: boolean; openaiApiKey?: string } = {}
): Promise<string> {
  const ruleBased = generateServiceableNameRuleBased(input);
  if (options.useAI && options.openaiApiKey) {
    const aiName = await generateServiceableNameWithAI(input, options.openaiApiKey);
    if (aiName) return aiName;
  }
  return ruleBased;
}
