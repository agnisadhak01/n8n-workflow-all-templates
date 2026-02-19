-- Add unique_common_serviceable_name and source_url to template_analytics_view
-- Required for AnalyzAX integration (API returns these in template payloads)

DROP VIEW IF EXISTS public.template_analytics_view;
CREATE VIEW public.template_analytics_view AS
SELECT
  t.id,
  t.source_id,
  t.source_url,
  t.title AS original_title,
  t.description AS original_description,
  t.category,
  t.tags,

  ta.use_case_name,
  ta.use_case_description,
  ta.unique_common_serviceable_name,
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

COMMENT ON VIEW public.template_analytics_view IS 'Templates joined with enriched analytics (use case, industries, processes, node stats, pricing). Includes source_url and unique_common_serviceable_name for AnalyzAX integration.';
