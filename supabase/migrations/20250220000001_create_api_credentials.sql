-- API credentials table for key-based authentication of data APIs (e.g. AnalyzAX endpoints).
-- Keys are stored hashed (SHA-256); full key shown only once on create.

CREATE TABLE IF NOT EXISTS public.api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS idx_api_credentials_key_hash ON public.api_credentials (key_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_credentials_is_active ON public.api_credentials (is_active);

COMMENT ON TABLE public.api_credentials IS 'API keys for data APIs; keys hashed with SHA-256, prefix stored for display';
COMMENT ON COLUMN public.api_credentials.key_prefix IS 'First 8 chars of key for display (e.g. n8n_abc1)';
COMMENT ON COLUMN public.api_credentials.key_hash IS 'SHA-256 hash of full key (never store plain key)';
COMMENT ON COLUMN public.api_credentials.scopes IS 'Allowed scopes (e.g. analyzax:templates, analyzax:services)';

-- RLS: service role only (no anon access)
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_credentials_service_role_only"
  ON public.api_credentials
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
