-- API request logs for data APIs (e.g. /api/analyzax/*).
-- Tracks each request for auditing and history.

CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid REFERENCES public.api_credentials(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  request_params jsonb DEFAULT '{}',
  status_code integer NOT NULL,
  response_summary jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_credential_id ON public.api_request_logs (credential_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON public.api_request_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_endpoint ON public.api_request_logs (endpoint);

COMMENT ON TABLE public.api_request_logs IS 'Audit log of API requests to data endpoints';
COMMENT ON COLUMN public.api_request_logs.credential_id IS 'API key used (null if auth failed)';
COMMENT ON COLUMN public.api_request_logs.request_params IS 'Query params or request body summary';
COMMENT ON COLUMN public.api_request_logs.response_summary IS 'Optional response metadata (e.g. templates_returned count)';

-- RLS: service role only
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_request_logs_service_role_only"
  ON public.api_request_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
