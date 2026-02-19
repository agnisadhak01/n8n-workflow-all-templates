# Database Schema

> Supabase schema for templates, node types, stacks, and template_stacks.

## Overview

| Table | Purpose |
|-------|---------|
| `templates` | Workflow metadata, nodes, raw JSON, full-text search |
| `node_types` | Node type → template mapping for faceted search |
| `template_analytics` | Enriched use case, industries, processes, node stats, pricing (one row per template) |
| `admin_job_runs` | Run history for enrichment and scraper jobs (started_at, completed_at, status, result counts) |
| `stacks` | Stack labels (e.g., "Google Sheets", "OpenAI") |
| `template_stacks` | Many-to-many link between templates and stacks |

| View | Purpose |
|------|---------|
| `template_analytics_view` | Templates left-joined with template_analytics. The explorer template detail page (`/templates/[id]`) queries it to show use case, top_2_industries, top_2_processes, and final_price_inr. |

## Tables

### templates

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated UUID |
| `source_id` | text (unique) | n8n template ID from api.n8n.io |
| `title` | text | Workflow title |
| `description` | text (nullable) | Workflow description |
| `category` | text (nullable) | Categorized label (e.g., "Email & Communication") |
| `tags` | text[] | Array of tag strings |
| `nodes` | jsonb | Normalized node array |
| `raw_workflow` | jsonb | Full n8n workflow JSON |
| `source_url` | text (nullable) | URL to template on n8n |
| `search_vector` | tsvector (nullable) | Full-text search vector |
| `created_at` | timestamptz | Insert timestamp |
| `updated_at` | timestamptz | Update timestamp |

**Constraints:**
- `source_id` is unique (used for upsert)

**Indexes:**
- Full-text search on `search_vector` (e.g., GIN index)

### node_types

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated UUID |
| `template_id` | uuid (FK → templates.id) | Template reference |
| `node_type` | text | n8n node type (e.g., "n8n-nodes-base.openAi") |
| `count` | integer | Number of instances in workflow |

**Constraints:**
- Foreign key to `templates.id` (ON DELETE CASCADE recommended)

### stacks

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated UUID |
| `slug` | text (unique) | Slug (e.g., "google-sheets") |
| `label` | text | Display label |
| `category` | text (nullable) | Optional category |
| `created_at` | timestamptz | Insert timestamp |
| `updated_at` | timestamptz (nullable) | Update timestamp |

### template_stacks

| Column | Type | Description |
|--------|------|-------------|
| `template_id` | uuid (FK → templates.id) | Template reference |
| `stack_id` | uuid (FK → stacks.id) | Stack reference |

**Constraints:**
- Composite primary key (template_id, stack_id)
- Foreign keys to templates and stacks

## Row Level Security (RLS)

| Table | Policy | Effect |
|-------|--------|--------|
| `templates` | Public read | SELECT allowed for anon |
| `templates` | Service role write | INSERT/UPDATE/DELETE via service key |
| `node_types` | Public read | SELECT allowed for anon |
| `node_types` | Service role write | Writes via service key |
| `stacks` | Public read | SELECT allowed |
| `template_stacks` | Public read | SELECT allowed |

The explorer uses the anon key; writes are performed only by the scraper with the service role key.

## Data Quality Queries

After large scrapes, verify data:

```sql
-- Template and node_type counts
SELECT count(*) FROM public.templates;
SELECT count(*) FROM public.node_types;

-- Missing category/tags
SELECT
  count(*) FILTER (WHERE category IS NULL) AS no_category,
  count(*) FILTER (WHERE tags IS NULL OR array_length(tags, 1) IS NULL) AS no_tags
FROM public.templates;

-- Orphaned node_types (should be 0)
SELECT count(*)
FROM public.node_types nt
WHERE NOT EXISTS (SELECT 1 FROM public.templates t WHERE t.id = nt.template_id);
```

## Migrations

Schema is applied via Supabase migrations (MCP `apply_migration` or SQL Editor). Prefer the Supabase MCP for migrations; see [n8n-project rules](.cursor/rules/n8n-project.mdc).

| Migration | Purpose |
|-----------|---------|
| `20250127000001` | Create `admin_job_runs` table |
| `20250218000002` | Allow `job_type = 'top2'` in `admin_job_runs` |
| `20250219000001` | Add `get_admin_insights()` RPC |
| `20250219000002` | Add `admin_mark_stale_job_runs()` and pg_cron (every 15 min) |
| `20250219000003` | Add `unique_common_serviceable_name` to template_analytics |
| `20250219000004` | Allow `job_type = 'serviceable_name'` in `admin_job_runs` |
| `20250219000005` | Add serviceable_name stats to `get_admin_insights()` |
| `20250219000006` | Allow `status = 'stopped'` for user-initiated cancellation |

The scraper expects:

- `templates` with `source_id` unique
- `node_types` with `template_id` FK
- `stacks` and `template_stacks` for stack filtering (optional)

Seed data for stacks is in `scripts/seed_stacks.sql`.

## template_analytics

Enriched analytics per template. See [Enrichment Guide](enrichment-guide.md) for population and usage.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `template_id` | uuid (FK → templates.id) | Template reference |
| `use_case_name` | text | From template title |
| `use_case_description` | text (nullable) | Generated from title/description/tags |
| `applicable_industries` | jsonb | Array of `{name, confidence, ...}` |
| `applicable_processes` | jsonb | Array of `{name, confidence, ...}` |
| `top_2_industries` | jsonb | Top 2 industries extracted from use_case_description |
| `top_2_processes` | jsonb | Top 2 processes extracted from use_case_description |
| `unique_common_serviceable_name` | text (nullable) | Plain-English name (~15–25 chars) for non-technical users; AI-generated, or use case name if already clear |
| `unique_node_types` | text[] | Distinct node types in workflow |
| `total_unique_node_types` | integer | Count of distinct types |
| `total_node_count` | integer | Total nodes in workflow |
| `base_price_inr` | numeric | (repetitive×700)+(unique×2700); repetitive = total_node_count − total_unique_node_types |
| `complexity_multiplier` | numeric | 0.8–1.2 (from diversity ratio) |
| `final_price_inr` | numeric | base × multiplier |
| `enrichment_status` | text | pending, enriched, failed |
| `enrichment_method` | text (nullable) | ai, rule-based, hybrid |
| `confidence_score` | numeric (nullable) | 0–1 |

## admin_job_runs

Run history for admin-triggered jobs (enrichment, template scraper, top-2 classifier, and serviceable name). The explorer admin UI shows a single combined job run history table with job type tags (Enrichment, Data fetching, Top-2 classifier, Serviceable name). Only the service role can read or write; the table is not exposed to anon.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `job_type` | text | `enrichment`, `scraper`, `top2`, or `serviceable_name` |
| `started_at` | timestamptz | When the run was started |
| `completed_at` | timestamptz (nullable) | When the script reported completion |
| `status` | text | `running`, `completed`, `failed`, or `stopped` |
| `result` | jsonb (nullable) | Job-specific counts |

**Result payloads:**

- **Enrichment:** `{ "enriched_count": number, "failed_count": number }`; during run may include `total_count`
- **Scraper:** `{ "templates_ok": number, "templates_error": number }`; during run may include `total_count`
- **Top-2 classifier:** `{ "processed_count": number, "failed_count": number }`; during run may include `total_count`
- **Serviceable name:** `{ "processed_count": number, "failed_count": number }`; during run may include `total_count`

When a run is started from the admin UI, a row is inserted with `status = 'running'`. The script receives `ADMIN_RUN_ID` in the environment and updates the row on exit with `completed_at`, `status`, and `result`. Scripts report progress during runs (e.g. `total_count`, processed/failed) for the admin UI progress bar. **Status values:** `running` (in progress), `completed` (finished successfully), `failed` (error or stale), `stopped` (user cancelled via "Mark as stopped").

**Functions:**

- `admin_mark_stale_job_runs()` — Marks runs as `failed` when `status = 'running'` and `started_at` is older than 2 hours. Returns count of rows updated. Called by pg_cron every 15 minutes and by the "Cleanup stale runs" button.
- `get_admin_insights()` — Returns JSON with detailed counts for scraper, enrichment, top2, and serviceable_name (e.g. total templates, pending, filled) for the admin UI insights cards.

## See Also

- [Setup](setup.md) — Supabase configuration
- [Enrichment Guide](enrichment-guide.md) — Populating template_analytics
- [Architecture](architecture.md) — Data flow
- [API Reference](api-reference.md) — Template type
