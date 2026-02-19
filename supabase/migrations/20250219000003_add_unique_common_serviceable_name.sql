-- Add unique_common_serviceable_name: plain-English name for each workflow, AI-populated.
-- Intended for non-technical users to quickly understand what the template does.

ALTER TABLE public.template_analytics
  ADD COLUMN IF NOT EXISTS unique_common_serviceable_name TEXT;

COMMENT ON COLUMN public.template_analytics.unique_common_serviceable_name IS
  'Human-friendly workflow name (3–7 words) that a non-technical person can understand. AI-generated from use case and nodes.';
