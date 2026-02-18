/**
 * Backfill admin_job_runs from git history: infers scraper and enrichment "runs"
 * from commits that touched relevant paths, deduplicates by day, and outputs
 * SQL INSERTs (or optionally inserts via Supabase).
 *
 * Prerequisite: Apply migration supabase/migrations/20250218000001_create_admin_job_runs.sql
 * in your Supabase project (SQL Editor or MCP) so the table exists.
 *
 * Run: npx tsx scripts/backfill-admin-job-runs-from-git.ts [--dry-run] [--insert]
 *
 * --dry-run (default): print SQL only
 * --insert: run INSERTs via Supabase (requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 *
 * Paths used:
 * - Scraper (template fetch): scripts/scraper/
 * - Enrichment: scripts/enrich-analytics.ts, scripts/enrichment/, supabase/migrations/
 */

import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "scripts/scraper/.env") });

const SCRAPER_PATHS = "scripts/scraper/";
const ENRICHMENT_PATHS =
  "scripts/enrich-analytics.ts scripts/enrichment/ supabase/migrations/";

function runGitLog(paths: string): string[] {
  try {
    const out = execSync(
      `git log --all --format="%ai" -- ${paths}`,
      { encoding: "utf-8", maxBuffer: 4 * 1024 * 1024 }
    );
    return out
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Deduplicate by calendar day (use first timestamp of that day). */
function dedupeByDay(timestamps: string[]): string[] {
  const byDay = new Map<string, string>();
  for (const ts of timestamps) {
    const day = ts.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, ts);
  }
  return [...byDay.values()].sort();
}

/** Convert git log date "2026-02-10 17:54:39 +0530" to ISO for Postgres. */
function toPgTimestamp(gitDate: string): string {
  const m = gitDate.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/);
  if (m) {
    const [, date, time, sign, h, min] = m;
    return `${date}T${time}${sign}${h}:${min}`;
  }
  return gitDate.replace(" ", "T");
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--insert");

  const scraperDates = dedupeByDay(runGitLog(SCRAPER_PATHS));
  const enrichmentDates = dedupeByDay(runGitLog(ENRICHMENT_PATHS));

  console.log(
    `Git-based run candidates: ${scraperDates.length} scraper days, ${enrichmentDates.length} enrichment days`
  );

  const inserts: { job_type: string; started_at: string }[] = [];

  for (const d of scraperDates) {
    inserts.push({ job_type: "scraper", started_at: toPgTimestamp(d) });
  }
  for (const d of enrichmentDates) {
    inserts.push({ job_type: "enrichment", started_at: toPgTimestamp(d) });
  }

  if (inserts.length === 0) {
    console.log("No rows to backfill.");
    return;
  }

  if (dryRun) {
    console.log("\n-- SQL (run in Supabase SQL Editor or with --insert)\n");
    for (const row of inserts) {
      console.log(
        `INSERT INTO public.admin_job_runs (job_type, started_at, completed_at, status, result) VALUES ('${row.job_type}', '${row.started_at}', '${row.started_at}', 'completed', NULL);`
      );
    }
    console.log("\n-- Or use: npx tsx scripts/backfill-admin-job-runs-from-git.ts --insert");
    return;
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for --insert");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  (async () => {
    for (const row of inserts) {
      const { error } = await supabase.from("admin_job_runs").insert({
        job_type: row.job_type,
        started_at: row.started_at,
        completed_at: row.started_at,
        status: "completed",
        result: null,
      });
      if (error) {
        console.error(`Insert failed for ${row.job_type} ${row.started_at}:`, error.message);
      } else {
        console.log(`Inserted ${row.job_type} ${row.started_at}`);
      }
    }
    console.log("Backfill done.");
  })();
}

main();
