import { spawn } from "child_process";
import path from "path";
import { createJobRun } from "./admin-jobs";

/**
 * Start the enrichment script in the background (detached).
 * Records a run in admin_job_runs and passes ADMIN_RUN_ID so the script can report completion.
 */
export async function startEnrichmentInBackground(options?: {
  batchSize?: number;
  limit?: number;
}): Promise<{ ok: boolean; runId?: string; error?: string }> {
  try {
    const run = await createJobRun("enrichment");
    if ("error" in run) return { ok: false, error: run.error };

    const repoRoot = path.join(process.cwd(), "..");
    const batchSize = String(
      options?.batchSize ?? parseInt(process.env.ENRICHMENT_BATCH_SIZE ?? "100", 10)
    );
    const scriptPath = path.join(repoRoot, "scripts", "enrich-analytics.ts");
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

    const args: string[] = [tsxCli, scriptPath, "--no-ai", "--batch-size", batchSize];
    const limit = options?.limit ?? 0;
    if (limit > 0) args.push("--limit", String(limit));

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
