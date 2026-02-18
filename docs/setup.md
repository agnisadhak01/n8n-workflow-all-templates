# Setup Guide

> Detailed setup and configuration instructions for development and deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Browse Page Setup](#browse-page-setup)
- [Templates Page Setup](#templates-page-setup)
- [Supabase Database](#supabase-database)
- [Scraper Configuration](#scraper-configuration)

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | LTS recommended |
| Python | 3.10+ | For scraper |
| npm | 9+ | Or pnpm |
| Supabase account | — | For Templates page only |

## Environment Variables

### Explorer (`explorer/.env.local`)

Copy from `explorer/.env.local.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | For Templates | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For Templates | Supabase anon (public) key |

The anon key is safe to expose; RLS restricts access to read-only template data.

### Scraper (`scripts/scraper/.env`)

Copy from `scripts/scraper/.env.example`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: AI categorization
# OPENAI_API_KEY=your-openai-api-key
# OPENAI_MODEL=gpt-4o-mini
# AI_BATCH_SIZE=25
# AI_BATCH_DELAY_MS=250
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS) |
| `OPENAI_API_KEY` | No | For `enrich:metadata` script |
| `OPENAI_MODEL` | No | Model for AI categorization (default: gpt-4o-mini) |
| `AI_BATCH_SIZE` | No | Templates per OpenAI batch |
| `AI_BATCH_DELAY_MS` | No | Delay between batches (ms) |

## Browse Page Setup

The Browse page uses a static JSON index. No Supabase required.

### 1. Build the Index

```bash
npm run build:index
```

This reads workflow files from `n8n-workflow-all-templates/` and `tags/` and produces `templates-index.json` in the project root.

### 2. Copy to Explorer

```bash
npm run copy:index
```

This copies the index to `explorer/public/templates-index.json`.

### 3. Verify

Start the dev server and visit `/browse`. The page loads the index from `/templates-index.json`.

## Templates Page Setup

The Templates page requires Supabase and scraped data.

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Note the project URL and keys (Settings → API)

### 2. Apply Database Schema

Use the Supabase SQL Editor or MCP to apply migrations. See [Database Schema](database-schema.md) for the full schema.

### 3. Configure Explorer

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `explorer/.env.local`.

### 4. Seed Data

**Option A: Sync from n8n API**

```bash
npm run scrape
```

Requires `scripts/scraper/.env` with Supabase credentials.

**Option B: Load from local JSON**

```bash
npm run scrape:local
```

Uses existing workflow files in `n8n-workflow-all-templates/`.

### 5. (Optional) Seed Stacks

For stack filtering, run `scripts/seed_stacks.sql` in the Supabase SQL editor to populate the `stacks` table.

## Supabase Database

Tables:

- `templates` — workflow metadata, nodes, raw_workflow
- `node_types` — node type → template mapping
- `stacks` — stack labels
- `template_stacks` — template ↔ stack links

RLS is enabled on `templates` and `node_types` with public read access. The scraper uses the service role key for writes.

Full schema: [Database Schema](database-schema.md).

## Scraper Configuration

### Python Dependencies

The scraper uses:

- `requests` — HTTP client
- `supabase` — Supabase Python client
- `python-dotenv` — Load .env

Install in a venv:

```bash
cd scripts/scraper
python -m venv venv
source venv/bin/activate   # or: venv\Scripts\activate on Windows
pip install requests supabase python-dotenv
```

### Scraper .env Location

The scraper loads `.env` from `scripts/scraper/`. Ensure the file exists and contains valid Supabase credentials.

## Troubleshooting

See [Troubleshooting](troubleshooting.md) for common setup issues.

## See Also

- [Getting Started](getting-started.md)
- [Database Schema](database-schema.md)
- [Scraper Guide](scraper-guide.md)
- [Enrichment Guide](enrichment-guide.md) — template analytics and [Web app integration (Coolify)](enrichment-guide.md#web-app-integration-coolify)
