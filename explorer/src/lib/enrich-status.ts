import { createClient } from "@supabase/supabase-js";
import { loadScraperEnvIfNeeded } from "./load-scraper-env";

export type EnrichmentStatus = {
  totalTemplates: number;
  enrichedCount: number;
  pendingCount: number;
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

  const [templatesRes, analyticsRes] = await Promise.all([
    supabase.from("templates").select("id", { count: "exact", head: true }),
    supabase
      .from("template_analytics")
      .select("id", { count: "exact", head: true })
      .eq("enrichment_status", "enriched"),
  ]);

  if (templatesRes.error) return { error: templatesRes.error.message };
  if (analyticsRes.error) return { error: analyticsRes.error.message };

  const totalTemplates = templatesRes.count ?? 0;
  const enrichedCount = analyticsRes.count ?? 0;
  const pendingCount = Math.max(0, totalTemplates - enrichedCount);

  return { totalTemplates, enrichedCount, pendingCount };
}
