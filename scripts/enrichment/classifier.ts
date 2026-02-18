/**
 * Industry and process classifier: hybrid rule-based + optional AI.
 */

import type {
  TemplateRow,
  ClassificationResult,
  ClassifiedItem,
} from "./types.js";

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  Healthcare: [
    "medical",
    "patient",
    "hospital",
    "health",
    "clinical",
    "dental",
    "pharmacy",
    "diagnosis",
    "treatment",
    "ehr",
  ],
  "E-commerce": [
    "shopify",
    "woocommerce",
    "stripe",
    "order",
    "cart",
    "product",
    "inventory",
    "checkout",
    "store",
    "ebay",
    "amazon",
  ],
  Marketing: [
    "hubspot",
    "mailchimp",
    "campaign",
    "seo",
    "ads",
    "newsletter",
    "lead",
    "outreach",
    "brand",
    "content",
  ],
  Finance: [
    "stripe",
    "invoice",
    "payment",
    "quickbooks",
    "expense",
    "crypto",
    "trading",
    "financial",
    "accounting",
  ],
  "Customer Support": [
    "zendesk",
    "support",
    "ticket",
    "helpdesk",
    "customer",
    "chat",
    "slack",
    "discord",
  ],
  "HR & Recruiting": [
    "hr",
    "resume",
    "recruit",
    "hiring",
    "candidate",
    "interview",
    "employee",
    "onboarding",
  ],
  "Sales & CRM": [
    "crm",
    "salesforce",
    "pipedrive",
    "hubspot",
    "lead",
    "deal",
    "contact",
    "sales",
  ],
  "Content & Media": [
    "youtube",
    "blog",
    "instagram",
    "twitter",
    "linkedin",
    "video",
    "content",
    "social",
    "media",
  ],
  "IT & DevOps": [
    "github",
    "gitlab",
    "jira",
    "slack",
    "docker",
    "deploy",
    "server",
    "api",
  ],
  "Legal & Compliance": [
    "legal",
    "contract",
    "compliance",
    "audit",
    "document",
  ],
  Education: [
    "course",
    "learning",
    "student",
    "education",
    "training",
  ],
  "Real Estate": ["estate", "property", "listing", "zillow", "realtor"],
  "Travel & Hospitality": [
    "travel",
    "booking",
    "hotel",
    "flight",
    "calendar",
    "reservation",
  ],
  "General / Cross-industry": ["automation", "workflow", "n8n", "integration"],
};

const PROCESS_KEYWORDS: Record<string, string[]> = {
  "Lead Generation": [
    "lead",
    "prospect",
    "qualification",
    "scoring",
    "outreach",
    "cold",
  ],
  "Customer Support": [
    "ticket",
    "zendesk",
    "support",
    "helpdesk",
    "reply",
    "inbox",
  ],
  "Marketing Automation": [
    "campaign",
    "newsletter",
    "email",
    "social",
    "post",
    "schedule",
  ],
  "Sales Pipeline": ["crm", "deal", "pipeline", "sales", "contact", "hubspot"],
  "Data Sync & ETL": [
    "sync",
    "transfer",
    "export",
    "import",
    "sheet",
    "database",
    "csv",
  ],
  "Notifications & Alerts": [
    "alert",
    "notification",
    "slack",
    "telegram",
    "email",
    "digest",
  ],
  "Content Creation": [
    "generate",
    "content",
    "blog",
    "image",
    "video",
    "ai",
    "gpt",
  ],
  "Reporting & Analytics": [
    "report",
    "analytics",
    "dashboard",
    "summary",
    "insight",
  ],
  "Form & Survey Processing": [
    "form",
    "typeform",
    "survey",
    "submission",
    "jotform",
  ],
  "Scheduling & Booking": [
    "calendar",
    "booking",
    "schedule",
    "appointment",
    "calendly",
  ],
  "Document Processing": [
    "pdf",
    "document",
    "ocr",
    "extract",
    "parse",
    "invoice",
  ],
  "AI & LLM Workflows": [
    "openai",
    "gemini",
    "claude",
    "ai",
    "llm",
    "chatbot",
    "rag",
    "agent",
  ],
};

function buildSearchText(template: TemplateRow): string {
  const parts: string[] = [];
  if (template.title) parts.push(template.title);
  if (template.description) parts.push(template.description);
  if (template.category) parts.push(template.category);
  if (Array.isArray(template.tags)) parts.push(template.tags.join(" "));
  return parts.join(" ").toLowerCase();
}

function ruleBasedClassify(
  searchText: string,
  keywordMap: Record<string, string[]>
): ClassifiedItem[] {
  const results: ClassifiedItem[] = [];
  for (const [name, keywords] of Object.entries(keywordMap)) {
    let matches = 0;
    const matched: string[] = [];
    for (const kw of keywords) {
      if (searchText.includes(kw)) {
        matches++;
        matched.push(kw);
      }
    }
    if (matches > 0) {
      const confidence = Math.min(0.95, 0.5 + matches * 0.1);
      results.push({
        name,
        confidence,
        keywords: matched.length > 0 ? matched : undefined,
      });
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Call OpenAI (or compatible) API for classification when rule-based is weak.
 * Returns null if no API key or request fails.
 */
async function classifyWithAI(
  template: TemplateRow,
  apiKey: string
): Promise<ClassificationResult | null> {
  const text = buildSearchText(template);
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a classifier. Given an n8n workflow template's title, description, and tags, output JSON only with two arrays: "industries" and "processes". Each item has "name" (string) and "confidence" (0-1 number). Use real-world industry names (e.g. Healthcare, E-commerce, Marketing) and business process names (e.g. Lead Generation, Customer Support). Return 1-5 industries and 1-5 processes. No markdown, no explanation, only valid JSON.`,
      },
      {
        role: "user",
        content: `Title: ${template.title}\nDescription: ${(template.description || "").slice(0, 1500)}\nTags: ${(template.tags || []).join(", ")}\n\nRespond with JSON: { "industries": [...], "processes": [...] }`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
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
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as {
      industries?: ClassifiedItem[];
      processes?: ClassifiedItem[];
    };
    const industries = Array.isArray(parsed.industries) ? parsed.industries : [];
    const processes = Array.isArray(parsed.processes) ? parsed.processes : [];
    const confidenceScore =
      industries.length > 0 || processes.length > 0
        ? Math.min(
            0.95,
            (industries.reduce((s, i) => s + (i.confidence ?? 0.5), 0) +
              processes.reduce((s, p) => s + (p.confidence ?? 0.5), 0)) /
              (industries.length + processes.length || 1)
          )
        : 0.5;
    return {
      industries,
      processes,
      method: "ai",
      confidenceScore,
    };
  } catch {
    return null;
  }
}

/**
 * Classify template into applicable industries and processes.
 * Uses rule-based first; if useAI and apiKey are set and rule-based yields few results, calls AI.
 */
export async function classify(
  template: TemplateRow,
  options: { useAI?: boolean; openaiApiKey?: string } = {}
): Promise<ClassificationResult> {
  const searchText = buildSearchText(template);
  const industries = ruleBasedClassify(searchText, INDUSTRY_KEYWORDS);
  const processes = ruleBasedClassify(searchText, PROCESS_KEYWORDS);

  const ruleConfidence =
    industries.length > 0 || processes.length > 0
      ? Math.min(
          0.95,
          [...industries, ...processes].reduce((s, i) => s + i.confidence, 0) /
            (industries.length + processes.length)
        )
      : 0;

  const useAI =
    options.useAI &&
    options.openaiApiKey &&
    (industries.length === 0 || processes.length === 0 || ruleConfidence < 0.5);

  if (useAI && options.openaiApiKey) {
    const aiResult = await classifyWithAI(template, options.openaiApiKey);
    if (aiResult) {
      const mergedIndustries =
        industries.length >= aiResult.industries.length
          ? industries
          : [...industries, ...aiResult.industries.filter((ai) => !industries.some((r) => r.name === ai.name))];
      const mergedProcesses =
        processes.length >= aiResult.processes.length
          ? processes
          : [...processes, ...aiResult.processes.filter((ai) => !processes.some((r) => r.name === ai.name))];
      return {
        industries: mergedIndustries.length ? mergedIndustries : aiResult.industries,
        processes: mergedProcesses.length ? mergedProcesses : aiResult.processes,
        method: "hybrid",
        confidenceScore: Math.max(ruleConfidence, aiResult.confidenceScore),
      };
    }
  }

  const confidenceScore =
    industries.length > 0 || processes.length > 0 ? ruleConfidence : 0.4;
  return {
    industries,
    processes,
    method: "rule-based",
    confidenceScore,
  };
}
