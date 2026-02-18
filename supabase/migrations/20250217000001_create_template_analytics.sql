-- Template Analytics: enriched use case data, node stats, and pricing
-- Run via Supabase MCP apply_migration or SQL Editor

CREATE TABLE IF NOT EXISTS public.template_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,

  -- Enriched fields
  use_case_name TEXT NOT NULL,
  use_case_description TEXT,
  applicable_industries JSONB DEFAULT '[]'::jsonb,
  applicable_processes JSONB DEFAULT '[]'::jsonb,

  -- Node statistics
  unique_node_types TEXT[] DEFAULT '{}',
  total_unique_node_types INTEGER NOT NULL DEFAULT 0,
  total_node_count INTEGER NOT NULL DEFAULT 0,

  -- Pricing (stored + computable)
  base_price_inr NUMERIC(10,2),
  complexity_multiplier NUMERIC(5,2) DEFAULT 1.0,
  final_price_inr NUMERIC(10,2),

  -- Metadata
  enrichment_status TEXT DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'enriched', 'failed')),
  enrichment_method TEXT CHECK (enrichment_method IN ('ai', 'rule-based', 'hybrid')),
  confidence_score NUMERIC(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_analytics_template_id ON public.template_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_enrichment_status ON public.template_analytics(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_template_analytics_final_price_inr ON public.template_analytics(final_price_inr);
CREATE INDEX IF NOT EXISTS idx_template_analytics_applicable_industries ON public.template_analytics USING GIN(applicable_industries);
CREATE INDEX IF NOT EXISTS idx_template_analytics_applicable_processes ON public.template_analytics USING GIN(applicable_processes);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_template_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_template_analytics_updated_at ON public.template_analytics;
CREATE TRIGGER trigger_template_analytics_updated_at
  BEFORE UPDATE ON public.template_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_template_analytics_updated_at();

-- RLS: public read, service role write (same pattern as templates)
ALTER TABLE public.template_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_analytics_public_read" ON public.template_analytics;
CREATE POLICY "template_analytics_public_read" ON public.template_analytics
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "template_analytics_service_write" ON public.template_analytics;
CREATE POLICY "template_analytics_service_write" ON public.template_analytics
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.template_analytics IS 'Enriched analytics per template: use case, industries, processes, node stats, pricing';
