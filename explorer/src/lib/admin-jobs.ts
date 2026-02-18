import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadScraperEnvIfNeeded } from "./load-scraper-env";

export type JobType = "enrichment" | "scraper" | "top2";

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
    processed_count?: number;
  } | null;
};

/**
 * Fetch job run history in chronological order (oldest first), optionally filtered by type.
 * Returns a single combined list; limit 100 when unfiltered.
 */
export async function getJobHistory(options?: {
  type?: JobType;
}): Promise<{ runs: JobRunRow[] } | { error: string }> {
  try {
    const supabase = getSupabase();
    const limit = 100;
    const orderAsc = true; // chronological: oldest first (backfill order)

    let query = supabase
      .from("admin_job_runs")
      .select("id, job_type, started_at, completed_at, status, result")
      .order("started_at", { ascending: orderAsc })
      .limit(limit);

    if (
      options?.type === "enrichment" ||
      options?.type === "scraper" ||
      options?.type === "top2"
    ) {
      query = query.eq("job_type", options.type);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };
    const runs = (data ?? []) as JobRunRow[];
    return { runs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
