import { spawn } from "child_process";
import path from "path";

/**
 * Start the template scraper (fetch from api.n8n.io and upsert to templates table) in the background.
 * Runs: python run.py --batch-size N --delay D from scripts/scraper.
 */
export function startScraperInBackground(options?: {
  batchSize?: number;
  delay?: number;
  limit?: number;
}): { ok: boolean; error?: string } {
  try {
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

    const child = spawn(python, args, {
      cwd: scraperDir,
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.unref();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
