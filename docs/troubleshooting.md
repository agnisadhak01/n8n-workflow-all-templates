# Troubleshooting

> Common issues and solutions for n8n-workflow-all-templates.

## Table of Contents

- [Browse Page](#browse-page)
- [Templates Page](#templates-page)
- [Scraper](#scraper)
- [Build & Deployment](#build--deployment)

## Browse Page

### "Failed to load templates index"

**Cause:** `explorer/public/templates-index.json` is missing.

**Solution:**
```bash
npm run build:index
npm run copy:index
```

Verify the file exists at `explorer/public/templates-index.json`.

### Empty or outdated template list

**Cause:** Index not rebuilt after template changes.

**Solution:** Rebuild and copy:
```bash
npm run build:index
npm run copy:index
```

### Tags not showing

**Cause:** `tags/` directory or `tagToIds` in index may be incomplete.

**Solution:** Ensure `build-index.js` reads from `tags/` and populates `tagToIds`. Check `scripts/build-index.js` logic.

## Templates Page

### "No templates" or blank page

**Cause:** Supabase not configured or no data.

**Checks:**
1. `explorer/.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Supabase project has `templates` table with rows
3. Browser console for CORS or RLS errors

**Solution:**
- Run `npm run scrape` or `npm run scrape:local` to populate data
- Verify RLS allows public read on `templates` and `node_types`

### Search not working

**Cause:** Missing or invalid `search_vector` / full-text index.

**Solution:** Ensure the Supabase schema includes a GIN index on `search_vector` and that it is populated during normalization/upload.

### Workflow preview blank

**Cause:** Invalid `raw_workflow` or React Flow conversion error.

**Checks:**
- `raw_workflow` contains `nodes` and optionally `connections`
- `parseN8nWorkflowToReactFlow` in `n8n-to-reactflow.ts` handles the structure
- Browser console for errors

### "supabase is null"

**Cause:** Env vars not set; client returns `null`.

**Solution:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `explorer/.env.local`. Restart dev server after changing env vars.

## Scraper

### "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"

**Cause:** Scraper `.env` missing or incomplete.

**Solution:**
```bash
cd scripts/scraper
cp .env.example .env
# Edit .env with your Supabase URL and service role key
```

### Rate limiting / 429 from api.n8n.io

**Cause:** Too many requests in short time.

**Solution:** Increase delay and reduce batch size:
```bash
python run.py --delay 1.0 --batch-size 20
```

### State file corrupted

**Cause:** Interrupted write or invalid JSON in `.scraper_state.json`.

**Solution:** Delete state and resume from scratch:
```bash
rm scripts/scraper/.scraper_state.json
python run.py --no-resume
```

### "Template dir not found" (run_local)

**Cause:** Expected path `n8n-workflow-all-templates/n8n-workflow-all-templates/` missing.

**Solution:** Run from repo root; ensure the nested templates directory exists and contains JSON files.

### Python module not found

**Cause:** Running from wrong directory or missing venv.

**Solution:**
```bash
cd scripts/scraper
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install requests supabase python-dotenv
python run.py --limit 1
```

## Build & Deployment

### Next.js build fails

**Cause:** Type errors, missing deps, or env issues.

**Solution:**
- Run `cd explorer && npm run build` to see errors
- Ensure `npm install` completed
- Check for `NEXT_PUBLIC_*` vars if build references them

### Vercel: Browse page fails in production

**Cause:** `templates-index.json` not in `explorer/public/` at build time.

**Solution:** Add a build step that runs `npm run build:index && npm run copy:index` before the Next.js build. See [Deployment](deployment.md).

### Supabase RLS blocks reads

**Cause:** RLS policies too restrictive.

**Solution:** Ensure policies allow `SELECT` for `anon` role on `templates`, `node_types`, `stacks`, `template_stacks`. Use Supabase Dashboard → Authentication → Policies.

## Data Quality

### Missing category/tags after scrape

Run in Supabase SQL Editor:
```sql
SELECT count(*) FILTER (WHERE category IS NULL) AS no_category,
       count(*) FILTER (WHERE tags IS NULL OR array_length(tags, 1) IS NULL) AS no_tags
FROM public.templates;
```

Consider running `npm run enrich:metadata` for AI-assisted categorization (requires `OPENAI_API_KEY`).

### Orphaned node_types

```sql
SELECT count(*) FROM public.node_types nt
WHERE NOT EXISTS (SELECT 1 FROM public.templates t WHERE t.id = nt.template_id);
```

Should be 0. If not, delete orphaned rows or fix the scraper to avoid them.

## See Also

- [Setup](setup.md)
- [Deployment](deployment.md)
- [Scraper Guide](scraper-guide.md)
