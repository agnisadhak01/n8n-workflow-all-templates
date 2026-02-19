/**
 * Apply migration 20250218000002: allow job_type 'top2' in admin_job_runs.
 *
 * Run: npm run db:migrate:top2
 *
 * Env: DATABASE_URL — Postgres connection string (URI format).
 *   Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)
 *   Example: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 *
 * Alternative: Use Supabase SQL Editor and run the SQL from
 *   supabase/migrations/20250218000002_allow_top2_job_type.sql
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Client } from "pg";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "scripts/scraper/.env") });
config({ path: resolve(process.cwd(), "explorer/.env.local") });

const MIGRATION_SQL = `
-- Allow job_type 'top2' for Top-2 classifier run history (same table as enrichment and scraper).
ALTER TABLE public.admin_job_runs
  DROP CONSTRAINT IF EXISTS admin_job_runs_job_type_check;

ALTER TABLE public.admin_job_runs
  ADD CONSTRAINT admin_job_runs_job_type_check
  CHECK (job_type IN ('enrichment', 'scraper', 'top2'));

COMMENT ON TABLE public.admin_job_runs IS 'Run history for enrichment, scraper, and top2 classifier jobs; result stores job-specific counts';
`;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "Missing DATABASE_URL. Set it in .env or scripts/scraper/.env.\n" +
        "Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)"
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(MIGRATION_SQL);
    console.log("Migration applied: admin_job_runs now allows job_type 'top2'.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Migration failed:", msg);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
