-- Allow status 'stopped' for user-initiated job cancellation (Mark as stopped).

ALTER TABLE public.admin_job_runs
  DROP CONSTRAINT IF EXISTS admin_job_runs_status_check;

ALTER TABLE public.admin_job_runs
  ADD CONSTRAINT admin_job_runs_status_check
  CHECK (status IN ('running', 'completed', 'failed', 'stopped'));

COMMENT ON COLUMN public.admin_job_runs.status IS 'running, completed, failed, or stopped (user-initiated)';
