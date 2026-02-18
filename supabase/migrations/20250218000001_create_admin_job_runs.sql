-- Admin job runs: history of enrichment and scraper runs (start time, completion, counts)
-- Used by explorer admin UI; only service_role can read/write.

CREATE TABLE IF NOT EXISTS public.admin_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('enrichment', 'scraper')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  result JSONB
);

CREATE INDEX IF NOT EXISTS idx_admin_job_runs_job_type_started_at
  ON public.admin_job_runs (job_type, started_at DESC);

ALTER TABLE public.admin_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_job_runs_service_role_only" ON public.admin_job_runs;
CREATE POLICY "admin_job_runs_service_role_only" ON public.admin_job_runs
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.admin_job_runs IS 'Run history for enrichment and scraper jobs; result stores enriched_count/failed_count or templates_ok/templates_error';
