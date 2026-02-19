# Troubleshooting

> Common issues and solutions for n8n-workflow-all-templates.

## Table of Contents

- [Browse Page](#browse-page)
- [Templates Page](#templates-page)
- [Scraper](#scraper)
- [Admin Page](#admin-page)
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

## Admin Page

### 401 Unauthorized or redirected to login

**Cause:** `/admin` and `/api/admin` are protected. Missing or invalid session, or wrong credentials.

**Solution:**
- Sign in at `/admin/login`. Default credentials are `superadmin` / `superpass`; override with `ADMIN_BASIC_USER` and `ADMIN_BASIC_PASSWORD` in `explorer/.env.local` or Coolify env. Restart the dev server or redeploy after changing env vars.
- If using HTTP Basic Auth for API calls, send the same credentials in the `Authorization` header. Ensure no reverse proxy strips the `Authorization` header.

### Admin page loads but run buttons fail

**Cause:** API routes also require `ENRICHMENT_ADMIN_SECRET` for programmatic calls; or Supabase env vars missing for the scripts.

**Solution:** Set `ENRICHMENT_ADMIN_SECRET` in env. For Coolify, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` so the admin API and background scripts can access Supabase. See [Enrichment Guide](enrichment-guide.md#web-app-integration-coolify).

### Runs stuck as "running"

**Cause:** A script was killed, crashed, or lost connection without updating the database. The admin UI cannot detect this directly; runs older than 2 hours with no update show "Possibly stopped".

**Solution:**
- Use **Mark as stopped** on the specific run to mark it as `stopped` (user-initiated cancellation).
- Use **Cleanup stale runs** to mark all runs stuck as "running" for 2+ hours as failed.
- In production, `admin_mark_stale_job_runs()` runs every 15 minutes via pg_cron (migration `20250219000002`).

### Top-2 run ends quickly with 0 processed

**Cause:** Older versions of the top-2 script exited when the first batch had all rows already filled, instead of advancing to the next batch. Fixed in recent updates: the script now skips past fully-filled batches and continues until all pending rows are processed or the batch returns empty and exhausted.

**Solution:** Ensure you use the latest `scripts/enrich-top-classifier.ts`. Re-run top-2 to process remaining rows.

### Serviceable name or "Mark as stopped" fails with constraint error

**Cause:** Migrations for `unique_common_serviceable_name`, `serviceable_name` job type, or `stopped` status not applied.

**Solution:** Apply migrations `20250219000003` through `20250219000006` via Supabase MCP `apply_migration` or SQL Editor. See [Enrichment Guide](enrichment-guide.md#setup).

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
