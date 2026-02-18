-- View: templates that do not yet have a template_analytics row.
-- Used by the enrichment script for pause/resume: each run fetches only pending templates.

CREATE OR REPLACE VIEW public.templates_pending_analytics AS
SELECT
  t.id,
  t.source_id,
  t.title,
  t.description,
  t.category,
  t.tags,
  t.nodes,
  t.created_at
FROM public.templates t
LEFT JOIN public.template_analytics ta ON t.id = ta.template_id
WHERE ta.id IS NULL
ORDER BY t.created_at ASC;

COMMENT ON VIEW public.templates_pending_analytics IS 'Templates without analytics; used for resumable enrichment (fetch next batch from here).';
