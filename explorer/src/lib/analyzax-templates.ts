/**
 * Fetches enriched templates for AnalyzAX integration.
 * Filters by industry and AnalyzAX service names, returns templates with headers metadata.
 */

import { supabase } from "@/lib/supabase";
import {
  extractProcessNames,
  extractIndustryNames,
  matchProcessToService,
  matchesIndustry,
} from "./analyzax-mapping";

export interface AnalyzaxTemplate {
  template_id: string;
  source_id: string;
  source_url: string | null;
  use_case_name: string;
  unique_common_serviceable_name: string | null;
  use_case_description: string | null;
  final_price_inr: number | null;
  matched_service: string;
}

export interface FetchTemplatesOptions {
  industry?: string | null;
  services: string[];
  limit?: number;
}

export interface FetchTemplatesResult {
  templates: AnalyzaxTemplate[];
  total_returned: number;
}

/**
 * Fetch templates from template_analytics that match the given industry and AnalyzAX services.
 * Uses template_analytics + templates join for source_url and unique_common_serviceable_name.
 */
export async function fetchTemplatesForAnalyzax(
  options: FetchTemplatesOptions
): Promise<FetchTemplatesResult> {
  const { industry = null, services, limit = 15 } = options;
  if (!services || services.length === 0) {
    return { templates: [], total_returned: 0 };
  }
  if (!supabase) {
    return { templates: [], total_returned: 0 };
  }

  const normalizedServices = services.map((s) => String(s).trim()).filter(Boolean);
  if (normalizedServices.length === 0) {
    return { templates: [], total_returned: 0 };
  }

  const maxLimit = Math.min(Math.max(1, limit), 50);

  const { data: rows, error } = await supabase
    .from("template_analytics")
    .select(
      `
      template_id,
      use_case_name,
      use_case_description,
      unique_common_serviceable_name,
      applicable_industries,
      applicable_processes,
      top_2_industries,
      top_2_processes,
      final_price_inr,
      templates (source_id, source_url)
    `
    )
    .eq("enrichment_status", "enriched")
    .not("use_case_name", "is", null)
    .limit(500)
    .order("confidence_score", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[AnalyzaxTemplates] Supabase error:", error);
    return { templates: [], total_returned: 0 };
  }

  const templates: AnalyzaxTemplate[] = [];
  const seenIds = new Set<string>();
  const perServiceCount: Record<string, number> = {};
  const maxPerService = Math.max(2, Math.ceil(maxLimit / normalizedServices.length));

  for (const row of rows ?? []) {
    if (templates.length >= maxLimit) break;

    const templateId = row.template_id as string;
    if (seenIds.has(templateId)) continue;

    const allProcesses = [
      ...extractProcessNames(row.applicable_processes),
      ...extractProcessNames(row.top_2_processes),
    ];
    const allIndustries = [
      ...extractIndustryNames(row.applicable_industries),
      ...extractIndustryNames(row.top_2_industries),
    ];

    const matchedService = matchProcessToService(allProcesses, normalizedServices);
    if (!matchedService) continue;

    if (!matchesIndustry(allIndustries, industry)) continue;

    const count = (perServiceCount[matchedService] ?? 0) + 1;
    if (count > maxPerService) continue;
    perServiceCount[matchedService] = count;

    seenIds.add(templateId);
    const templatesRow = Array.isArray(row.templates)
      ? (row.templates[0] as { source_id?: string; source_url?: string } | undefined)
      : (row.templates as { source_id?: string; source_url?: string } | null);
    const sourceId = templatesRow?.source_id ?? "";
    const sourceUrl = templatesRow?.source_url ?? null;

    templates.push({
      template_id: templateId,
      source_id: sourceId,
      source_url: sourceUrl,
      use_case_name: String(row.use_case_name ?? ""),
      unique_common_serviceable_name: row.unique_common_serviceable_name
        ? String(row.unique_common_serviceable_name)
        : null,
      use_case_description: row.use_case_description ? String(row.use_case_description) : null,
      final_price_inr: row.final_price_inr != null ? Number(row.final_price_inr) : null,
      matched_service: matchedService,
    });
  }

  // Sort by price ascending (affordability) within matched service
  templates.sort((a, b) => {
    const priceA = a.final_price_inr ?? Infinity;
    const priceB = b.final_price_inr ?? Infinity;
    return priceA - priceB;
  });

  return { templates, total_returned: templates.length };
}
