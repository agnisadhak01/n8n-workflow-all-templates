-- View: template_analytics_view
-- Joins templates with enriched analytics for convenient querying

CREATE OR REPLACE VIEW public.template_analytics_view AS
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
