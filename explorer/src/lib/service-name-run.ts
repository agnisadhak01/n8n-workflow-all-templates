import { spawn } from "child_process";
import path from "path";
import { loadScraperEnvIfNeeded } from "./load-scraper-env";
import { createJobRun } from "./admin-jobs";

/**
 * Start the serviceable name enrichment script in the background with AI enabled.
 * Populates unique_common_serviceable_name in template_analytics using OpenAI.
 * Records a run in admin_job_runs and passes ADMIN_RUN_ID so the script can report completion.
 * Resumable by default: only fills empty names; use refresh: true to recompute existing.
 */
export async function startServiceableNameInBackground(options?: {
  batchSize?: number;
  limit?: number;
  refresh?: boolean;
}): Promise<{ ok: boolean; runId?: string; error?: string }> {
  try {
    loadScraperEnvIfNeeded();
    const run = await createJobRun("serviceable_name");
    if ("error" in run) return { ok: false, error: run.error };

    const repoRoot = path.join(process.cwd(), "..");
    const batchSize = String(
      options?.batchSize ?? parseInt(process.env.ENRICHMENT_BATCH_SIZE ?? "50", 10)
    );
    const scriptPath = path.join(repoRoot, "scripts", "enrich-serviceable-name.ts");
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

    const args: string[] = [tsxCli, scriptPath, "--use-ai", "--batch-size", batchSize];
    const limit = options?.limit ?? 0;
    if (limit > 0) args.push("--limit", String(limit));
    if (options?.refresh) args.push("--refresh");

    const env = { ...process.env, ADMIN_RUN_ID: run.id };

    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      detached: true,
      stdio: "ignore",
      env,
    });
    child.unref();
    return { ok: true, runId: run.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
