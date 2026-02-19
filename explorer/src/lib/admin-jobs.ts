import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadScraperEnvIfNeeded } from "./load-scraper-env";

export type JobType = "enrichment" | "scraper" | "top2" | "serviceable_name";

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
    total_count?: number;
  } | null;
};

/**
 * Fetch job run history in chronological order (oldest first), optionally filtered by type.
 * Returns the 100 most recent runs (newest first from DB, then reversed for display).
 * This ensures running and just-finished runs are always included.
 */
export async function getJobHistory(options?: {
  type?: JobType;
}): Promise<{ runs: JobRunRow[] } | { error: string }> {
  try {
    const supabase = getSupabase();
    const limit = 100;

    let query = supabase
      .from("admin_job_runs")
      .select("id, job_type, started_at, completed_at, status, result")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (
      options?.type === "enrichment" ||
      options?.type === "scraper" ||
      options?.type === "top2" ||
      options?.type === "serviceable_name"
    ) {
      query = query.eq("job_type", options.type);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };
    const runs = (data ?? []) as JobRunRow[];
    runs.reverse(); // chronological oldest-first for display
    return { runs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Mark a job run as stopped. Use when the user cancels from the admin UI, or when a
 * script stopped without updating the DB (e.g. killed, crashed, ran outside the admin UI).
 */
/**
 * Mark stale running runs as failed (no update for 2+ hours).
 * Calls the database function; also invoked by pg_cron every 15 min.
 */
export async function markStaleJobRuns(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("admin_mark_stale_job_runs");
    if (error) return { ok: false, error: error.message };
    const count = typeof data === "number" ? data : 0;
    return { ok: true, count };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function markJobRunStopped(runId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("admin_job_runs")
      .update({
        status: "stopped",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("status", "running");
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
