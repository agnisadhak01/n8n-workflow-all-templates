/**
 * Top-2 classifier: extracts top 2 industries and top 2 processes
 * by analyzing use_case_description text (rule-based + optional AI).
 */

import type { ClassifiedItem } from "./types.js";

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

const TOP_N = 2;

/**
 * Call OpenAI to extract top 2 industries and processes from use case description.
 * Returns null if no API key or request fails.
 */
async function classifyTop2WithAI(
  useCaseDescription: string,
  apiKey: string
): Promise<{ industries: ClassifiedItem[]; processes: ClassifiedItem[] } | null> {
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a classifier. Given a use case description, output JSON only with two arrays: "industries" and "processes". Each item has "name" (string) and "confidence" (0-1 number). Return exactly the top 2 most relevant industries and top 2 most relevant business processes. Use real-world industry names (e.g. Healthcare, E-commerce, Marketing) and business process names (e.g. Lead Generation, Customer Support). No markdown, no explanation, only valid JSON.`,
      },
      {
        role: "user",
        content: `Use case description:\n${useCaseDescription.slice(0, 1500)}\n\nRespond with JSON: { "industries": [up to 2 items], "processes": [up to 2 items] }`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
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
    const industries = (Array.isArray(parsed.industries) ? parsed.industries : []).slice(0, TOP_N);
    const processes = (Array.isArray(parsed.processes) ? parsed.processes : []).slice(0, TOP_N);
    return { industries, processes };
  } catch {
    return null;
  }
}

export interface TopClassificationResult {
  top_2_industries: ClassifiedItem[];
  top_2_processes: ClassifiedItem[];
}

/**
 * Extract top 2 industries and top 2 processes by analyzing use_case_description.
 * When useAI and apiKey are set, calls AI first and uses AI results (with rule-based
 * fallback if AI fails or returns empty). Otherwise rule-based only.
 */
export async function classifyTop2(
  useCaseDescription: string,
  options: { useAI?: boolean; openaiApiKey?: string } = {}
): Promise<TopClassificationResult> {
  const searchText = (useCaseDescription || "").toLowerCase();
  const industries = ruleBasedClassify(searchText, INDUSTRY_KEYWORDS).slice(0, TOP_N);
  const processes = ruleBasedClassify(searchText, PROCESS_KEYWORDS).slice(0, TOP_N);

  const preferAI =
    Boolean(options.useAI && options.openaiApiKey && searchText.length > 0);

  if (preferAI) {
    const aiResult = await classifyTop2WithAI(useCaseDescription, options.openaiApiKey!);
    if (aiResult) {
      const aiIndustries = aiResult.industries.slice(0, TOP_N);
      const aiProcesses = aiResult.processes.slice(0, TOP_N);
      const mergedIndustries =
        aiIndustries.length >= TOP_N
          ? aiIndustries
          : [...aiIndustries, ...industries.filter((r) => !aiIndustries.some((a) => a.name === r.name))].slice(0, TOP_N);
      const mergedProcesses =
        aiProcesses.length >= TOP_N
          ? aiProcesses
          : [...aiProcesses, ...processes.filter((r) => !aiProcesses.some((a) => a.name === r.name))].slice(0, TOP_N);
      return {
        top_2_industries: mergedIndustries,
        top_2_processes: mergedProcesses,
      };
    }
  }

  return {
    top_2_industries: industries,
    top_2_processes: processes,
  };
}
