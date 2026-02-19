-- Mark stale admin_job_runs as failed (status='running' for 2+ hours).
-- Used by pg_cron for automatic cleanup, or called manually from admin UI.

CREATE OR REPLACE FUNCTION public.admin_mark_stale_job_runs()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH updated AS (
    UPDATE public.admin_job_runs
    SET status = 'failed', completed_at = NOW()
    WHERE status = 'running'
      AND started_at < NOW() - INTERVAL '2 hours'
    RETURNING id
  )
  SELECT COUNT(*)::int FROM updated;
$$;

COMMENT ON FUNCTION public.admin_mark_stale_job_runs() IS
  'Marks runs as failed when status=running and started_at > 2h ago. Returns count of rows updated.';

-- Schedule automatic cleanup every 15 minutes (requires pg_cron extension).
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT jobid FROM cron.job WHERE jobname = 'mark-stale-admin-job-runs'
  LOOP
    PERFORM cron.unschedule(rec.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'mark-stale-admin-job-runs',
  '*/15 * * * *',
  $$SELECT public.admin_mark_stale_job_runs()$$
);
