import { spawn } from "child_process";
import path from "path";
import { createJobRun } from "./admin-jobs";

/**
 * Start the template scraper (fetch from api.n8n.io and upsert to templates table) in the background.
 * Records a run in admin_job_runs and passes ADMIN_RUN_ID so the script can report completion.
 */
export async function startScraperInBackground(options?: {
  batchSize?: number;
  delay?: number;
  limit?: number;
}): Promise<{ ok: boolean; runId?: string; error?: string }> {
  try {
    const run = await createJobRun("scraper");
    if ("error" in run) return { ok: false, error: run.error };

    const repoRoot = path.join(process.cwd(), "..");
    const scraperDir = path.join(repoRoot, "scripts", "scraper");
    const scriptPath = path.join(scraperDir, "run.py");
    const python = process.env.PYTHON_PATH ?? "python";
    const batchSize = options?.batchSize ?? 50;
    const delay = options?.delay ?? 0.3;

    const args: string[] = [scriptPath, "--batch-size", String(batchSize), "--delay", String(delay)];
    if (options?.limit != null && options.limit > 0) {
      args.push("--limit", String(options.limit));
    }

    const env = { ...process.env, ADMIN_RUN_ID: run.id };

    const child = spawn(python, args, {
      cwd: scraperDir,
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
