-- Allow job_type 'top2' for Top-2 classifier run history (same table as enrichment and scraper).

ALTER TABLE public.admin_job_runs
  DROP CONSTRAINT IF EXISTS admin_job_runs_job_type_check;

ALTER TABLE public.admin_job_runs
  ADD CONSTRAINT admin_job_runs_job_type_check
  CHECK (job_type IN ('enrichment', 'scraper', 'top2'));

COMMENT ON TABLE public.admin_job_runs IS 'Run history for enrichment, scraper, and top2 classifier jobs; result stores job-specific counts';
