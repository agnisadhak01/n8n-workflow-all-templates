-- Add top_2_industries and top_2_processes to template_analytics
-- Populated by analyzing use_case_description during enrichment

ALTER TABLE public.template_analytics
  ADD COLUMN IF NOT EXISTS top_2_industries JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS top_2_processes JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_template_analytics_top_2_industries
  ON public.template_analytics USING GIN(top_2_industries);

CREATE INDEX IF NOT EXISTS idx_template_analytics_top_2_processes
  ON public.template_analytics USING GIN(top_2_processes);

COMMENT ON COLUMN public.template_analytics.top_2_industries IS 'Top 2 industries extracted from use_case_description';
COMMENT ON COLUMN public.template_analytics.top_2_processes IS 'Top 2 processes extracted from use_case_description';

-- Recreate view to expose new columns (must DROP first when adding columns in the middle)
DROP VIEW IF EXISTS public.template_analytics_view;
CREATE VIEW public.template_analytics_view AS
SELECT
  t.id,
  t.source_id,
  t.title AS original_title,
  t.description AS original_description,
  t.category,
  t.tags,

  ta.use_case_name,
  ta.use_case_description,
  ta.applicable_industries,
  ta.applicable_processes,
  ta.top_2_industries,
  ta.top_2_processes,
  ta.unique_node_types,
  ta.total_unique_node_types,
  ta.total_node_count,
  ta.base_price_inr,
  ta.complexity_multiplier,
  ta.final_price_inr,
  ta.enrichment_status,
  ta.enrichment_method,
  ta.confidence_score,
  ta.created_at AS analytics_created_at,
  ta.updated_at AS analytics_updated_at

FROM public.templates t
LEFT JOIN public.template_analytics ta ON t.id = ta.template_id;

COMMENT ON VIEW public.template_analytics_view IS 'Templates joined with enriched analytics (use case, industries, processes, node stats, pricing)';
