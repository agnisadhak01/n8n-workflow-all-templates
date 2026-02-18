import { spawn } from "child_process";
import path from "path";
import { createJobRun } from "./admin-jobs";

/**
 * Start the enrichment script in the background (detached).
 * Records a run in admin_job_runs and passes ADMIN_RUN_ID so the script can report completion.
 */
export async function startEnrichmentInBackground(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const run = await createJobRun("enrichment");
    if ("error" in run) return { ok: false, error: run.error };

    const repoRoot = path.join(process.cwd(), "..");
    const batchSize = process.env.ENRICHMENT_BATCH_SIZE ?? "100";
    const scriptPath = path.join(repoRoot, "scripts", "enrich-analytics.ts");
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

    const env = { ...process.env, ADMIN_RUN_ID: run.id };

    const child = spawn(
      process.execPath,
      [tsxCli, scriptPath, "--no-ai", "--batch-size", batchSize],
      {
        cwd: repoRoot,
        detached: true,
        stdio: "ignore",
        env,
      }
    );
    child.unref();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
