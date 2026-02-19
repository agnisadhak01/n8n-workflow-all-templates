-- Add serviceable_name stats to get_admin_insights() for the admin UI.

CREATE OR REPLACE FUNCTION public.get_admin_insights()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'scraper', jsonb_build_object(
      'total_templates', (SELECT COUNT(*)::int FROM public.templates),
      'templates_without_analytics', (
        SELECT COUNT(*)::int
        FROM public.templates t
        WHERE NOT EXISTS (SELECT 1 FROM public.template_analytics ta WHERE ta.template_id = t.id)
      )
    ),
    'enrichment', jsonb_build_object(
      'total_analytics', (SELECT COUNT(*)::int FROM public.template_analytics),
      'enriched', (SELECT COUNT(*)::int FROM public.template_analytics WHERE enrichment_status = 'enriched'),
      'pending', (SELECT COUNT(*)::int FROM public.template_analytics WHERE enrichment_status = 'pending'),
      'failed', (SELECT COUNT(*)::int FROM public.template_analytics WHERE enrichment_status = 'failed')
    ),
    'top2', jsonb_build_object(
      'total_analytics', (SELECT COUNT(*)::int FROM public.template_analytics),
      'filled_top2', (
        SELECT COUNT(*)::int
        FROM public.template_analytics
        WHERE top_2_industries IS NOT NULL
          AND top_2_industries != '[]'::jsonb
          AND jsonb_array_length(top_2_industries) > 0
          AND top_2_processes IS NOT NULL
          AND top_2_processes != '[]'::jsonb
          AND jsonb_array_length(top_2_processes) > 0
      ),
      'pending_top2', (
        SELECT COUNT(*)::int
        FROM public.template_analytics
        WHERE use_case_description IS NOT NULL
          AND use_case_description != ''
          AND (
            top_2_industries IS NULL
            OR top_2_industries = '[]'::jsonb
            OR jsonb_array_length(top_2_industries) = 0
          )
      ),
      'has_use_case_description', (
        SELECT COUNT(*)::int
        FROM public.template_analytics
        WHERE use_case_description IS NOT NULL AND use_case_description != ''
      )
    ),
    'serviceable_name', jsonb_build_object(
      'total_analytics', (SELECT COUNT(*)::int FROM public.template_analytics),
      'filled', (
        SELECT COUNT(*)::int
        FROM public.template_analytics
        WHERE unique_common_serviceable_name IS NOT NULL
          AND TRIM(unique_common_serviceable_name) != ''
      ),
      'pending', (
        SELECT COUNT(*)::int
        FROM public.template_analytics
        WHERE unique_common_serviceable_name IS NULL
          OR TRIM(unique_common_serviceable_name) = ''
      )
    )
  );
$$;

COMMENT ON FUNCTION public.get_admin_insights() IS 'Returns detailed counts for scraper, enrichment, top2 classifier, and serviceable name for the admin UI';
