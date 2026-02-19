/**
 * Mapping from n8n process/industry names to AnalyzAX service names.
 * Used by the AnalyzAX templates API to filter templates by recommended services.
 */

/** AnalyzAX service names (from lib/evaluation/scoringEngine.ts) */
export const ANALYSAX_SERVICES = [
  "Customer Management",
  "Lead Generation",
  "Email Management",
  "Task Management",
  "Workflow Management",
  "Resource Management",
  "AI Calling Agent",
  "Chatbot Implementation",
  "AI Customer Support Agent",
] as const;

/** n8n process names that map to each AnalyzAX service */
export const SERVICE_TO_N8N_PROCESSES: Record<string, string[]> = {
  "Lead Generation": ["Lead Generation", "Sales Pipeline", "Content Creation", "Marketing Automation"],
  "Customer Management": ["Customer Support", "Sales Pipeline", "Notifications & Alerts"],
  "Email Management": ["Marketing Automation", "Notifications & Alerts"],
  "Task Management": [
    "Data Sync & ETL",
    "Form & Survey Processing",
    "Document Processing",
    "Reporting & Analytics",
  ],
  "Workflow Management": [
    "Scheduling & Booking",
    "Notifications & Alerts",
    "AI & LLM Workflows",
    "Data Sync & ETL",
  ],
  "Resource Management": ["Reporting & Analytics", "Data Sync & ETL"],
  "AI Calling Agent": ["AI & LLM Workflows", "Customer Support", "Scheduling & Booking"],
  "Chatbot Implementation": ["AI & LLM Workflows", "Customer Support", "Marketing Automation"],
  "AI Customer Support Agent": ["AI & LLM Workflows", "Customer Support"],
};

/** n8n industry names that map to AnalyzAX NAICS-style industries */
export const INDUSTRY_ALIASES: Record<string, string[]> = {
  Healthcare: ["Healthcare", "Health"],
  Retail: ["Retail", "E-commerce", "Ecommerce"],
  "Retail/E-commerce": ["Retail", "E-commerce", "Ecommerce"],
  Manufacturing: ["Manufacturing"],
  "Finance/Banking": ["Finance", "Finance/Banking", "Banking"],
  "Professional Services": ["Professional Services", "Professional"],
  Education: ["Education"],
  "General / Cross-industry": [], // Empty = matches any industry
};

/**
 * Extract process names from JSONB array (applicable_processes or top_2_processes).
 */
export function extractProcessNames(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => (typeof item === "object" && item !== null && "name" in item ? String((item as { name: unknown }).name) : null))
    .filter((n): n is string => typeof n === "string" && n.length > 0);
}

/**
 * Extract industry names from JSONB array (applicable_industries or top_2_industries).
 */
export function extractIndustryNames(arr: unknown): string[] {
  return extractProcessNames(arr); // Same structure { name, confidence?, ... }
}

/**
 * Check if a template's processes match any of the requested AnalyzAX services.
 * Returns the first matching AnalyzAX service name, or null.
 */
export function matchProcessToService(
  processNames: string[],
  requestedServices: string[]
): string | null {
  const processSet = new Set(processNames.map((p) => p.toLowerCase().trim()));
  for (const service of requestedServices) {
    const n8nProcesses = SERVICE_TO_N8N_PROCESSES[service];
    if (!n8nProcesses) continue;
    for (const np of n8nProcesses) {
      if (processSet.has(np.toLowerCase())) return service;
      // Partial match: e.g. "Lead Generation" in process matches "Lead Generation" in n8n
      for (const p of processSet) {
        if (p.includes(np.toLowerCase()) || np.toLowerCase().includes(p)) return service;
      }
    }
  }
  return null;
}

/**
 * Check if template industries match the requested industry (case-insensitive partial match).
 */
export function matchesIndustry(templateIndustries: string[], requestedIndustry: string | null): boolean {
  if (!requestedIndustry || requestedIndustry.trim() === "") return true;
  const req = requestedIndustry.toLowerCase().trim();
  if (req === "general / cross-industry") return true;
  for (const ind of templateIndustries) {
    const lower = ind.toLowerCase();
    if (lower.includes(req) || req.includes(lower)) return true;
    const aliases = INDUSTRY_ALIASES[requestedIndustry] ?? [];
    if (aliases.some((a) => lower.includes(a.toLowerCase()))) return true;
  }
  return false;
}
