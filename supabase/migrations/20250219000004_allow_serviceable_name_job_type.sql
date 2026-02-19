-- Allow job_type 'serviceable_name' for the serviceable name enrichment run history.

ALTER TABLE public.admin_job_runs
  DROP CONSTRAINT IF EXISTS admin_job_runs_job_type_check;

ALTER TABLE public.admin_job_runs
  ADD CONSTRAINT admin_job_runs_job_type_check
  CHECK (job_type IN ('enrichment', 'scraper', 'top2', 'serviceable_name'));

COMMENT ON TABLE public.admin_job_runs IS 'Run history for enrichment, scraper, top2 classifier, and serviceable name jobs; result stores job-specific counts';
