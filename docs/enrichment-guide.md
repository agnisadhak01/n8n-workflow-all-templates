# Template Analytics Enrichment Guide

This guide covers the template analytics enrichment pipeline: populating the `template_analytics` table with use case names, descriptions, applicable industries and processes, node statistics, and pricing.

## Overview

The enrichment system:

1. **Use case name** — Copied from the original template title.
2. **Use case description** — Generated from title, description, and tags (rule-based or AI-enhanced).
3. **Applicable industries** — Classified from title, description, and tags (keyword rules + optional AI).
4. **Applicable processes** — Classified the same way (e.g. Lead Generation, Customer Support).
5. **Node statistics** — Total nodes, unique node types (comma-separated), and counts from the workflow.
6. **Pricing (INR)** — Repetitive nodes = `total_node_count - total_unique_node_types` (common/similar node instances); base = `(repetitive × 700) + (total_unique_node_types × 2700)`, then multiplied by a complexity factor (0.8–1.2). See [Recalculating pricing](#recalculating-pricing) to refresh prices after formula changes.
7. **Top 2 industries** — Populated by the **standalone** `enrich:top` script (see below), which analyzes existing `use_case_description` and updates only these two columns.
8. **Top 2 processes** — Same as above; no other fields are modified.

## Prerequisites

- Node.js 18+
- Supabase project with `templates` table (and applied migrations for `template_analytics` and `template_analytics_view`)

## Setup

### 1. Apply migrations

Ensure the following migrations are applied to your Supabase project (via SQL Editor or MCP):

- `supabase/migrations/20250217000001_create_template_analytics.sql` — creates `template_analytics` table, indexes, trigger, RLS
- `supabase/migrations/20250217000002_create_template_analytics_view.sql` — creates `template_analytics_view`
- `supabase/migrations/20250217000003_create_templates_pending_analytics_view.sql` — creates `templates_pending_analytics` view (templates without analytics) for pause/resume
- `supabase/migrations/20250218000001_create_admin_job_runs.sql` — creates `admin_job_runs` table for run history (admin UI)
- `supabase/migrations/20250218000002_allow_top2_job_type.sql` — allows `job_type = 'top2'` for Top-2 classifier run history

### 2. Environment variables

Create or edit `.env` in the repo root or `scripts/scraper/.env` (the script loads both):

```env
# Required for writing to Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: for AI-enhanced classification and descriptions
OPENAI_API_KEY=sk-...

# Optional: enrichment defaults
ENRICHMENT_BATCH_SIZE=50
ENRICHMENT_USE_AI=false

# Optional: AI rate limiting (when using --use-ai)
ENRICHMENT_AI_DELAY_MS=1200
ENRICHMENT_AI_BATCH_SIZE=0
ENRICHMENT_AI_BATCH_PAUSE_MS=60000
```

- **ENRICHMENT_AI_DELAY_MS** — Minimum milliseconds between consecutive AI API calls (default 1200). Lower values increase throughput but may hit rate limits; e.g. 1200 ms gives roughly 50 RPM if every template uses 2 calls.
- **ENRICHMENT_AI_BATCH_SIZE** — After this many AI requests, the script pauses (default 0 = disabled). Set e.g. to 20 to pause after every 20 requests.
- **ENRICHMENT_AI_BATCH_PAUSE_MS** — Length of that pause in ms (default 60000 = 1 minute). Used only when ENRICHMENT_AI_BATCH_SIZE &gt; 0.

### 3. Install dependencies

From the repo root:

```bash
npm install
```

This installs `tsx`, `dotenv`, and `@supabase/supabase-js` (see root `package.json` devDependencies).

## Running the enrichment

### Interactive mode (default)

When you run the script with no arguments in a terminal, it prompts for options:

```bash
npm run enrich:analytics
```

You will be asked:

- **Use AI (OpenAI)?** — Y/n (default: n). If yes and `OPENAI_API_KEY` is not set, you can enter a key at the prompt.
- **Templates per batch** — number (default: 50).
- **Max templates to process this run** — 0 = no limit, or a number.
- **Skip already-enriched templates (resumable)?** — Y/n (default: Y). Recommended so you can pause and resume.
- If using AI: **Delay between AI requests (ms)**, **AI batch size** (0 = off), and **AI batch pause (ms)**.

After the prompts, the script runs with your choices. To use defaults without prompts, pass any CLI flag (e.g. `--no-ai`).

### Basic run (rule-based only, non-interactive)

Process templates that do not yet have analytics. Uses keyword-based classification and rule-based descriptions only.

```bash
npm run enrich:analytics -- --no-ai
```

### With a limit (e.g. for testing)

Process at most 20 templates:

```bash
npm run enrich:analytics -- --limit 20
```

### With AI (OpenAI)

Enable AI for classification and description when rule-based results are weak:

```bash
npm run enrich:analytics -- --use-ai
```

Or pass the API key on the command line:

```bash
npm run enrich:analytics -- --use-ai --openai-key sk-...
```

### Pause and resume

The script is **pause/resumable** when using the default `--skip-existing` (default on):

- **Pause:** Press Ctrl+C (SIGINT) or send SIGTERM. The script finishes the current template and then exits. No progress file is needed.
- **Resume:** Run the same command again (e.g. `npm run enrich:analytics` or `npm run enrich:analytics -- --use-ai`). It fetches only templates that do not yet have analytics (via the `templates_pending_analytics` view), so work continues from where you left off.

You can stop and start as often as needed; each run processes the next batch of pending templates until none remain.

### Rate limits (when using --use-ai)

When `--use-ai` is set, the script enforces a minimum delay between each AI API call and an optional batch pause so OpenAI rate limits (RPM/TPM) are respected. No changes are required for small runs; for large runs or strict limits, set:

- **ENRICHMENT_AI_DELAY_MS** — e.g. `1200` for ~50 RPM (two calls per template), or `600` for ~100 RPM if your tier allows.
- **ENRICHMENT_AI_BATCH_SIZE** and **ENRICHMENT_AI_BATCH_PAUSE_MS** — e.g. batch size `20` and pause `60000` to pause 1 minute after every 20 requests.

You can override these with `--ai-delay-ms`, `--ai-batch-size`, and `--ai-batch-pause-ms` on the command line.

### Other options

| Option | Description |
|--------|-------------|
| `--batch-size N` | Number of templates to fetch per batch (default: 50 or `ENRICHMENT_BATCH_SIZE`) |
| `--no-skip-existing` | Re-process templates that already have analytics (recompute and upsert) |
| `--no-ai` | Disable AI even if `ENRICHMENT_USE_AI` is set |
| `--ai-delay-ms N` | Min ms between AI requests (default: 1200 or `ENRICHMENT_AI_DELAY_MS`) |
| `--ai-batch-size N` | Pause after every N AI requests (0 = off; default from env) |
| `--ai-batch-pause-ms N` | Pause duration in ms after each batch (default from env) |

## Top-2 classifier (standalone)

The **top-2 classifier** runs independently and updates only `top_2_industries` and `top_2_processes` in `template_analytics`. It does not change any other columns.

**When to run:** After `enrich:analytics` has populated rows (so that `use_case_description` exists). Run:

```bash
npm run enrich:top
```

**To cover all rows:** Run with no `--limit` (and without `--refresh`) to fill only rows that still have empty `top_2_industries` / `top_2_processes`. Use `--refresh` to recompute existing values.

**Explorer display:** The template detail page (`/templates/[id]`) fetches from `template_analytics_view` and shows use case name/description, **Top industries** and **Top processes** (from `top_2_industries` and `top_2_processes`), and price (final_price_inr) when analytics exist for that template.

Interactive mode will prompt for options. Non-interactive examples:

```bash
# Rule-based only, process rows that have no top_2 set yet
npm run enrich:top -- --no-ai

# With a limit (e.g. 20 rows)
npm run enrich:top -- --limit 20

# Recompute top_2 for all rows that have use_case_description (overwrite existing)
npm run enrich:top -- --refresh

# Disable AI and use rule-based classification only
npm run enrich:top -- --no-ai
```

**AI is used by default** when `OPENAI_API_KEY` is set (or passed via `--openai-key`). The classifier calls OpenAI first and uses AI results; rule-based is only a fallback if AI fails or returns empty.

| Option | Description |
|--------|-------------|
| `--batch-size N` | Rows to process per batch (default: 50) |
| `--limit N` | Max rows to process this run (0 = no limit) |
| `--refresh` | Recompute even when top_2_* is already set |
| `--use-ai` | Use OpenAI (default when OPENAI_API_KEY is set) |
| `--no-ai` | Disable AI; use rule-based classification only |
| `--ai-delay-ms N` | Delay between AI requests in ms |

Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; `OPENAI_API_KEY` required for AI (default behavior).

## Validation

After running enrichment, you can validate data with the queries in `scripts/enrichment/validation-queries.sql`. Run them in the Supabase SQL Editor or via MCP `execute_sql`.

Examples:

- **Counts:** total templates vs total analytics rows, and how many templates still lack analytics.
- **Status:** breakdown by `enrichment_status` (e.g. enriched, failed).
- **Sample:** spot-check a few rows (use_case_name, node counts, final_price_inr, enrichment_method).
- **Quality:** find rows with null or invalid pricing or low confidence.

## Querying enriched data

### Using the view

```sql
SELECT
  original_title,
  use_case_name,
  use_case_description,
  total_node_count,
  total_unique_node_types,
  final_price_inr,
  applicable_industries,
  applicable_processes
FROM public.template_analytics_view
WHERE final_price_inr IS NOT NULL
ORDER BY final_price_inr DESC
LIMIT 10;
```

### Filter by industry (JSONB)

To find templates applicable to "Healthcare":

```sql
SELECT * FROM public.template_analytics_view
WHERE applicable_industries @> '[{"name": "Healthcare"}]'::jsonb
LIMIT 10;
```

Or using `jsonb_path_query_array`:

```sql
SELECT * FROM public.template_analytics_view
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(applicable_industries) AS elem
  WHERE elem->>'name' = 'Healthcare'
)
LIMIT 10;
```

## Recalculating pricing

To recompute only pricing for existing analytics rows (e.g. after changing the formula in code), use either the script or raw SQL.

### Using the script (recommended)

The script uses the same formula as the code (repetitive vs unique nodes) and updates `base_price_inr`, `complexity_multiplier`, and `final_price_inr` for all enriched rows. Batches are ordered by `template_id` for stable, repeatable updates.

```bash
npm run enrich:pricing
```

Options:

| Option | Description |
|--------|-------------|
| `--batch-size N` | Rows per batch (default: 100 or `ENRICHMENT_BATCH_SIZE`) |
| `--limit N` | Max rows to update this run (0 = no limit; default: 0) |

Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (e.g. from `scripts/scraper/.env` or root `.env`).

**Example:** 10 nodes, 5 unique types → repetitive = 5; base = (5×700)+(5×2700) = 17,000 INR; final = base × complexity_multiplier.

### Using SQL

Alternatively, run an SQL update in the Supabase SQL Editor (or via MCP). This keeps existing `complexity_multiplier` values; the script above recalculates them from the diversity ratio.

```sql
UPDATE public.template_analytics
SET
  base_price_inr = (GREATEST(0, total_node_count - total_unique_node_types) * 700) + (total_unique_node_types * 2700),
  final_price_inr = ROUND(
    ((GREATEST(0, total_node_count - total_unique_node_types) * 700) + (total_unique_node_types * 2700)) * complexity_multiplier
  ),
  updated_at = NOW()
WHERE enrichment_status = 'enriched';
```

## Web app integration (Coolify)

When the explorer is deployed on [Coolify](https://coolify.io/), you can trigger and monitor enrichment from the web app.

### Coolify app setup

- **Base directory:** Repository root (not just `explorer/`), so the enrichment scripts and root `node_modules` are available.
- **Build:** `npm install && npm run build:explorer`
- **Start:** `cd explorer && npm start`

### Environment variables

In Coolify, set:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (for the explorer) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (for the explorer) |
| `SUPABASE_URL` | Yes | Same as above (for admin API and script) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (admin API and enrichment script) |
| `ENRICHMENT_ADMIN_SECRET` | Recommended | Secret for protecting status/run API and admin page; use a long random value |
| `ENRICHMENT_BATCH_SIZE` | No | Batch size for enrichment run (default: 100) |
| `OPENAI_API_KEY` | No | Required for **Run top-2 (AI)** button; server env only (not exposed to client) |

### Triggering a run

**From the admin UI:** Open `/admin/enrichment?secret=YOUR_SECRET` in the browser. You will see total / enriched / pending counts, **Run scraper**, **Run enrichment**, and **Run top-2 (AI)** buttons, and three run history tables (Enrichment, Data fetching, Top-2 classifier). Each run section has parameter fields (batch size, limit, and for scraper delay; for top-2 a refresh option) with default values that you can change before clicking Run. Click a run button to start the script in the background; use **Refresh status** to update counts and history.

**From the API:** Send a POST request with the secret in a header or query param:

```bash
curl -X POST "https://your-app.com/api/admin/enrich/run" \
  -H "x-admin-secret: YOUR_SECRET"
```

Response: 202 Accepted with a message that enrichment has started in the background.

### Admin UI parameters

Each run section on the admin page exposes parameters that are passed to the script. Defaults are shown below; you can change them in the UI before clicking Run.

- **Template fetch (scraper):** Batch size (default 50), Delay in seconds (default 0.3), Limit (default 0 = all templates).
- **Analytics enrichment:** Batch size (default 100), Limit (default 0 = no limit).
- **Top-2 classifier (AI):** Batch size (default 50), Limit (default 0 = no limit), Refresh — when enabled, recomputes existing `top_2_industries` and `top_2_processes`; when off, only rows with empty top_2_* are filled.

### Checking status

**From the admin UI:** The same page shows current counts.

**From the API:**

```bash
curl "https://your-app.com/api/admin/enrich/status?secret=YOUR_SECRET"
# or
curl -H "x-admin-secret: YOUR_SECRET" "https://your-app.com/api/admin/enrich/status"
```

Response: `{ "totalTemplates", "enrichedCount", "pendingCount" }`.

### Run history

Each run started from the admin UI (enrichment, template scraper, or top-2 classifier) is recorded in the `admin_job_runs` table. The admin page shows run history in **chronological order (oldest first)** so you can read history from the first run to the latest:

- **Insights (from run history)** — Summary cards: total enriched and total failed across all enrichment runs; total templates added and total errors across all scraper runs; total processed/failed for top-2 runs; run session counts; last run summary for each type.
- **Job run history** — A single combined table for all job types. Columns: Started, Completed, Duration, **Type** (tag: Enrichment / Data fetching / Top-2 classifier), **Result** (e.g. "736 enriched, 0 failed", "X ok, Y errors", or "X processed, Y failed" depending on type), Status (running / completed / failed). Runs that stay "running" for more than 2 hours show a "Stale" indicator.

History is stored in Supabase (`admin_job_runs`); see [Database Schema](database-schema.md#admin_job_runs). When you click **Run enrichment**, **Run scraper**, or **Run top-2 (AI)**, the app inserts a row with `status = 'running'` and passes `ADMIN_RUN_ID` in the environment to the script. The script updates that row on exit with `completed_at`, `status`, and result counts. Scripts triggered from the CLI (without the UI) do not receive `ADMIN_RUN_ID`, so they do not create or update run history.

**Manual backfill from git:** To backfill `admin_job_runs` with inferred runs from git history (commits that touched scraper or enrichment paths, one row per day per job type), run:

```bash
npm run backfill:job-history
```

This prints SQL INSERTs (dry-run). To insert directly into Supabase, run with `--insert` (requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`):

```bash
npx tsx scripts/backfill-admin-job-runs-from-git.ts --insert
```

### Notes

- The enrichment job runs in the same container as the web app. Long runs (e.g. ~7k templates) may be interrupted on deploy or restart; trigger again to resume (the script only processes pending templates).
- If `ENRICHMENT_ADMIN_SECRET` is not set, the API and admin page are allowed only in development (`NODE_ENV === "development"`). In production, always set the secret.
- **Local dev:** If `SUPABASE_SERVICE_ROLE_KEY` is not set in `explorer/.env.local`, the app loads `scripts/scraper/.env` when the Enrichment admin page or API is used, so you can reuse the scraper env. Otherwise set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `explorer/.env.local` (get the service role key from Supabase: Project Settings → API).

## File reference

| Path | Purpose |
|------|---------|
| `explorer/src/app/api/admin/enrich/status/route.ts` | GET enrichment counts (total, enriched, pending); protected by secret |
| `explorer/src/app/api/admin/enrich/run/route.ts` | POST to start enrichment script in background; protected by secret |
| `explorer/src/app/api/admin/jobs/history/route.ts` | GET run history; query `?type=enrichment`, `?type=scraper`, or `?type=top2`; protected by secret |
| `explorer/src/app/api/admin/scrape/run/route.ts` | POST to start template scraper in background; protected by secret |
| `explorer/src/lib/top2-run.ts` | Spawns top-2 classifier script with `--use-ai` (used by "Run top-2 (AI)" button) |
| `explorer/src/app/admin/enrichment/page.tsx` | Admin UI: status, parameter inputs per run type (batch size, limit, etc.) with defaults, Run scraper / Run enrichment / Run top-2 (AI), and combined job run history table; access via `?secret=...` |
| `scripts/enrich-analytics.ts` | Main entry: fetches templates, runs pipeline, upserts analytics |
| `scripts/enrichment/types.ts` | Shared TypeScript types |
| `scripts/enrichment/node-analyzer.ts` | Node statistics from `template.nodes` |
| `scripts/enrichment/classifier.ts` | Industry/process classification (rules + optional OpenAI) |
| `scripts/enrichment/top-classifier.ts` | Top-2 classification logic (used by standalone script) |
| `scripts/enrich-pricing.ts` | Standalone script: recalculates pricing only (base, multiplier, final INR) |
| `scripts/enrich-top-classifier.ts` | Standalone script: updates only top_2_industries, top_2_processes |
| `scripts/enrichment/description-generator.ts` | Use case description (rules + optional OpenAI) |
| `scripts/enrichment/pricing-calculator.ts` | INR pricing formula (repetitive × 700 + unique × 2700; complexity 0.8–1.2) |
| `scripts/enrichment/rate-limit.ts` | AI request rate limiter (delay and batch pause) |
| `scripts/enrichment/prompts.ts` | Interactive prompts (readline) for TTY mode |
| `scripts/enrichment/validation-queries.sql` | SQL for data quality checks |
| `scripts/backfill-admin-job-runs-from-git.ts` | Infers enrichment/scraper runs from git history for manual backfill of `admin_job_runs` |

## See also

- [Database Schema](database-schema.md) — Overall schema and tables
- [Setup](setup.md) — Supabase and env configuration
