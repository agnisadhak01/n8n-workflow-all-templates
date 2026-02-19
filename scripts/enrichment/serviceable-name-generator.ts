/**
 * Serviceable name generator: creates a plain-English 3-7 word name
 * that a non-technical person can understand (rule-based + optional AI).
 */

export interface ServiceableNameInput {
  title: string;
  useCaseDescription: string | null;
  useCaseName: string | null;
  nodeTypes: string[];
}

/**
 * Rule-based fallback: derive a short name from use_case_name or title.
 * Aim for 3-7 words; truncate if needed.
 */
export function generateServiceableNameRuleBased(input: ServiceableNameInput): string {
  const text =
    (input.useCaseName && input.useCaseName.trim()) ||
    (input.useCaseDescription && input.useCaseDescription.trim()) ||
    input.title ||
    "Workflow automation";
  const words = text.split(/\s+/).filter(Boolean);
  const take = Math.min(7, words.length);
  return words.slice(0, take).join(" ").slice(0, 80).trim() || "Workflow automation";
}

/**
 * Call OpenAI to generate a 3-7 word plain-English name a non-technical person would understand.
 * Returns null if no key or request fails.
 */
export async function generateServiceableNameWithAI(
  input: ServiceableNameInput,
  apiKey: string
): Promise<string | null> {
  const nodeSummary =
    input.nodeTypes.length > 0
      ? input.nodeTypes.slice(0, 10).join(", ")
      : "general automation";
  const desc = (input.useCaseDescription || "").slice(0, 500);
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You create short, plain-English names (3-7 words) for n8n workflow templates. Each name should describe what the workflow does in a way a non-technical person instantly understands. No jargon, no technical terms. Output only the name, nothing else.",
      },
      {
        role: "user",
        content: `Create a short human-friendly name for this workflow.

Title: ${input.title}
Use case: ${desc || "(none)"}
Key integrations/nodes: ${nodeSummary}

Output a 3-7 word name that captures what this workflow does. Example: "Auto-Send Invoices After Stripe Payment" or "Sync New Leads to CRM and Notify Sales". Only output the name, no quotes or punctuation.`,
      },
    ],
    max_tokens: 80,
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
    const cleaned = content.replace(/^["']|["']$/g, "").trim().slice(0, 100);
    return cleaned || null;
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
