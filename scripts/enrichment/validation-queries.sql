-- Validation queries for template_analytics enrichment pipeline
-- Run in Supabase SQL Editor or via MCP execute_sql

-- 1. Counts: templates vs analytics
SELECT
  (SELECT COUNT(*) FROM public.templates) AS total_templates,
  (SELECT COUNT(*) FROM public.template_analytics) AS total_analytics,
  (SELECT COUNT(*) FROM public.templates t
   WHERE NOT EXISTS (SELECT 1 FROM public.template_analytics ta WHERE ta.template_id = t.id)) AS templates_without_analytics;

-- 2. Enrichment status breakdown
SELECT enrichment_status, COUNT(*) AS cnt
FROM public.template_analytics
GROUP BY enrichment_status;

-- 3. Sample enriched rows (spot-check)
SELECT template_id, use_case_name, total_node_count, total_unique_node_types, final_price_inr, enrichment_method, confidence_score
FROM public.template_analytics
ORDER BY updated_at DESC
LIMIT 10;

-- 4. Invalid or low-confidence rows (optional quality checks)
SELECT id, template_id, final_price_inr, confidence_score
FROM public.template_analytics
WHERE enrichment_status = 'enriched'
  AND (final_price_inr IS NULL OR final_price_inr < 0 OR confidence_score < 0.5)
LIMIT 20;

-- 5. View: join templates with analytics
SELECT * FROM public.template_analytics_view LIMIT 5;
