import { createClient } from "@supabase/supabase-js";
import { loadScraperEnvIfNeeded } from "./load-scraper-env";

export type AdminInsights = {
  scraper: {
    totalTemplates: number;
    templatesWithoutAnalytics: number;
  };
  enrichment: {
    totalAnalytics: number;
    enriched: number;
    pending: number;
    failed: number;
  };
  top2: {
    totalAnalytics: number;
    filledTop2: number;
    pendingTop2: number;
    hasUseCaseDescription: number;
  };
};

export type EnrichmentStatus = {
  totalTemplates: number;
  enrichedCount: number;
  pendingCount: number;
  insights?: AdminInsights;
};

export async function getEnrichmentStatus(): Promise<
  EnrichmentStatus | { error: string }
> {
  loadScraperEnvIfNeeded();

  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    const missing = [
      !url && "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL",
      !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean) as string[];
    return {
      error: `Server misconfiguration: missing Supabase credentials (${missing.join(", ")}). Add them to explorer/.env.local, or ensure scripts/scraper/.env exists with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`,
    };
  }

  const supabase = createClient(url, serviceKey);

  const [templatesRes, analyticsRes, insightsRes] = await Promise.all([
    supabase.from("templates").select("id", { count: "exact", head: true }),
    supabase
      .from("template_analytics")
      .select("id", { count: "exact", head: true })
      .eq("enrichment_status", "enriched"),
    supabase.rpc("get_admin_insights").single(),
  ]);

  if (templatesRes.error) return { error: templatesRes.error.message };
  if (analyticsRes.error) return { error: analyticsRes.error.message };

  const totalTemplates = templatesRes.count ?? 0;
  const enrichedCount = analyticsRes.count ?? 0;
  const pendingCount = Math.max(0, totalTemplates - enrichedCount);

  let insights: AdminInsights | undefined;
  if (!insightsRes.error && insightsRes.data) {
    const raw = insightsRes.data as {
      scraper?: { total_templates?: number; templates_without_analytics?: number };
      enrichment?: { total_analytics?: number; enriched?: number; pending?: number; failed?: number };
      top2?: { total_analytics?: number; filled_top2?: number; pending_top2?: number; has_use_case_description?: number };
    };
    insights = {
      scraper: {
        totalTemplates: raw.scraper?.total_templates ?? 0,
        templatesWithoutAnalytics: raw.scraper?.templates_without_analytics ?? 0,
      },
      enrichment: {
        totalAnalytics: raw.enrichment?.total_analytics ?? 0,
        enriched: raw.enrichment?.enriched ?? 0,
        pending: raw.enrichment?.pending ?? 0,
        failed: raw.enrichment?.failed ?? 0,
      },
      top2: {
        totalAnalytics: raw.top2?.total_analytics ?? 0,
        filledTop2: raw.top2?.filled_top2 ?? 0,
        pendingTop2: raw.top2?.pending_top2 ?? 0,
        hasUseCaseDescription: raw.top2?.has_use_case_description ?? 0,
      },
    };
  }

  return { totalTemplates, enrichedCount, pendingCount, insights };
}
