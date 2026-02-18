import { spawn } from "child_process";
import path from "path";

/**
 * Start the enrichment script in the background (detached).
 * Used by the API route and by the admin page server action.
 */
export function startEnrichmentInBackground(): { ok: boolean; error?: string } {
  try {
    const repoRoot = path.join(process.cwd(), "..");
    const batchSize = process.env.ENRICHMENT_BATCH_SIZE ?? "100";
    const scriptPath = path.join(repoRoot, "scripts", "enrich-analytics.ts");
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

    const child = spawn(
      process.execPath,
      [tsxCli, scriptPath, "--no-ai", "--batch-size", batchSize],
      {
        cwd: repoRoot,
        detached: true,
        stdio: "ignore",
        env: process.env,
      }
    );
    child.unref();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
