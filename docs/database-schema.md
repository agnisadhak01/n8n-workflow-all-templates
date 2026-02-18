# Database Schema

> Supabase schema for templates, node types, stacks, and template_stacks.

## Overview

| Table | Purpose |
|-------|---------|
| `templates` | Workflow metadata, nodes, raw JSON, full-text search |
| `node_types` | Node type → template mapping for faceted search |
| `template_analytics` | Enriched use case, industries, processes, node stats, pricing (one row per template) |
| `stacks` | Stack labels (e.g., "Google Sheets", "OpenAI") |
| `template_stacks` | Many-to-many link between templates and stacks |

| View | Purpose |
|------|---------|
| `template_analytics_view` | Templates left-joined with template_analytics for querying enriched data |

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

Schema is applied via Supabase migrations (MCP `apply_migration` or SQL Editor). The scraper expects:

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
| `unique_node_types` | text[] | Distinct node types in workflow |
| `total_unique_node_types` | integer | Count of distinct types |
| `total_node_count` | integer | Total nodes in workflow |
| `base_price_inr` | numeric | (repetitive×700)+(unique×2700); repetitive = total_node_count − total_unique_node_types |
| `complexity_multiplier` | numeric | 0.8–1.2 (from diversity ratio) |
| `final_price_inr` | numeric | base × multiplier |
| `enrichment_status` | text | pending, enriched, failed |
| `enrichment_method` | text (nullable) | ai, rule-based, hybrid |
| `confidence_score` | numeric (nullable) | 0–1 |

## See Also

- [Setup](setup.md) — Supabase configuration
- [Enrichment Guide](enrichment-guide.md) — Populating template_analytics
- [Architecture](architecture.md) — Data flow
- [API Reference](api-reference.md) — Template type
