import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadScraperEnvIfNeeded } from "./load-scraper-env";

export type JobType = "enrichment" | "scraper";

function getSupabase(): SupabaseClient {
  loadScraperEnvIfNeeded();
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
  return createClient(url, serviceKey);
}

/**
 * Insert a new job run with status 'running'. Returns the run id for passing to the script via env.
 */
export async function createJobRun(
  jobType: JobType
): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("admin_job_runs")
      .insert({ job_type: jobType, status: "running" })
      .select("id")
      .single();
    if (error) return { error: error.message };
    if (!data?.id) return { error: "No id returned" };
    return { id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

export type JobRunRow = {
  id: string;
  job_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  result: {
    enriched_count?: number;
    failed_count?: number;
    templates_ok?: number;
    templates_error?: number;
  } | null;
};

/**
 * Fetch job run history in chronological order (oldest first), optionally filtered by type. Limit 50 per type.
 */
export async function getJobHistory(options?: {
  type?: JobType;
}): Promise<{ enrichment: JobRunRow[]; scraper: JobRunRow[] } | { error: string }> {
  try {
    const supabase = getSupabase();
    const limit = 50;
    const orderAsc = true; // chronological: oldest first (backfill order)

    if (options?.type === "enrichment" || options?.type === "scraper") {
      const { data, error } = await supabase
        .from("admin_job_runs")
        .select("id, job_type, started_at, completed_at, status, result")
        .eq("job_type", options.type)
        .order("started_at", { ascending: orderAsc })
        .limit(limit);
      if (error) return { error: error.message };
      const list = (data ?? []) as JobRunRow[];
      return {
        enrichment: options.type === "enrichment" ? list : [],
        scraper: options.type === "scraper" ? list : [],
      };
    }

    const [enrichmentRes, scraperRes] = await Promise.all([
      supabase
        .from("admin_job_runs")
        .select("id, job_type, started_at, completed_at, status, result")
        .eq("job_type", "enrichment")
        .order("started_at", { ascending: orderAsc })
        .limit(limit),
      supabase
        .from("admin_job_runs")
        .select("id, job_type, started_at, completed_at, status, result")
        .eq("job_type", "scraper")
        .order("started_at", { ascending: orderAsc })
        .limit(limit),
    ]);

    if (enrichmentRes.error) return { error: enrichmentRes.error.message };
    if (scraperRes.error) return { error: scraperRes.error.message };

    return {
      enrichment: (enrichmentRes.data ?? []) as JobRunRow[],
      scraper: (scraperRes.data ?? []) as JobRunRow[],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
