# Deployment Guide

> Deployment strategies for the n8n-workflow-all-templates explorer and supporting services.

## Table of Contents

- [Vercel (Recommended)](#vercel-recommended)
- [Coolify](#coolify)
- [Environment Variables](#environment-variables)
- [CI/CD Pipeline](#cicd-pipeline)
- [Database Migrations](#database-migrations)
- [Performance Tips](#performance-tips)

## Vercel (Recommended)

The Next.js explorer is optimized for Vercel deployment.

### 1. Connect Repository

1. Go to [Vercel](https://vercel.com)
2. Import the GitHub/GitLab repository
3. Set **Root Directory** to `explorer`

### 2. Build Configuration

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `explorer` |
| Build Command | `npm run build` |
| Output Directory | `.next` (default) |
| Install Command | `npm install` |

### 3. Environment Variables

Add these in Vercel Project Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview |

### 4. Browse Page: Include Static Index

The Browse page needs `templates-index.json` in `explorer/public/`. Options:

**Option A: Pre-build and commit**

Run before committing:

```bash
npm run build:index
npm run copy:index
```

Commit `explorer/public/templates-index.json`.

**Option B: Build step in CI**

Add a root-level build step before deploying the explorer. Example GitHub Actions:

```yaml
- run: npm run build:index && npm run copy:index
- run: cd explorer && npm run build
```

Ensure the index is built before the Next.js build.

**Option C: Vercel build command override**

If your root `package.json` runs both:

```json
"build": "npm run build:index && npm run copy:index && cd explorer && npm run build"
```

Set Vercel root to repo root and build command to `npm run build`.

### 5. Deploy

Push to your main branch. Vercel deploys automatically.

## Coolify

Deploy from the **repository root** (not the `explorer` folder). The root `package.json` defines the build and start commands used by Coolify/Nixpacks.

### Build and start

| Setting | Value |
|---------|-------|
| Root | Repository root |
| Build command | `npm run build` (runs `build:index` → `copy:index` → `build:explorer`) |
| Start command | `npm run start` (runs `cd explorer && npm run start` — Next.js production server) |

The build generates the static index, copies it to `explorer/public/`, installs explorer dependencies, and builds the Next.js app. No separate root directory configuration is needed.

### Environment variables

Set in Coolify for the service:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | For Templates | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For Templates | Supabase anon key |
| `ADMIN_BASIC_USER` | Optional | Admin login username (env only). Default: `superadmin`. Set in production. |
| `ADMIN_BASIC_PASSWORD` | Optional | Admin login password (env only). Default: `superpass`. Set in production. |
| `ADMIN_SESSION_SECRET` | Optional | Secret for signing admin session cookies (defaults to `ENRICHMENT_ADMIN_SECRET`). Set in production. |
| `ENRICHMENT_ADMIN_SECRET` | For admin API | Secret for programmatic API access (header `x-admin-secret` or query `?secret=`) |
| `SUPABASE_URL` | For admin jobs | Same as above (for enrichment/scraper/top-2 runs) |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin jobs | Service role key (admin API and background scripts) |

See [Enrichment Guide – Web app integration (Coolify)](enrichment-guide.md#web-app-integration-coolify) for using the admin page and run history.

## Environment Variables

### Production Checklist

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | For Templates | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For Templates | Anon key; safe to expose |
| `ADMIN_BASIC_USER` | For admin | Admin login username (env only). Default: `superadmin`. Set in production. |
| `ADMIN_BASIC_PASSWORD` | For admin | Admin login password (env only). Default: `superpass`. Set a strong value in production. |
| `ADMIN_SESSION_SECRET` | For admin | Optional; used to sign session cookies (defaults to `ENRICHMENT_ADMIN_SECRET`). |
| `ENRICHMENT_ADMIN_SECRET` | For admin API | Protect status/run APIs when using admin features. |

No other server-side secrets for the public frontend. RLS limits Supabase access to read-only template data. Admin routes (`/admin`, `/api/admin`) use sign-in at `/admin/login` or HTTP Basic Auth (see [Enrichment Guide](enrichment-guide.md)).

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run build:index
      - run: npm run copy:index

      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: explorer
```

### Scraper in CI

To keep Supabase in sync, run the scraper on a schedule:

```yaml
name: Scrape Templates

on:
  schedule:
    - cron: "0 0 * * 0"  # Weekly
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - run: pip install requests supabase python-dotenv

      - name: Scrape
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npm run scrape -- --limit 100 --batch-size 20 --delay 0.5 --no-resume
```

Store `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repository secrets.

## Database Migrations

Supabase schema is applied via migrations (MCP or SQL editor). Before deploying:

1. Apply any new migrations to the Supabase project
2. Run `scripts/seed_stacks.sql` if using stack filtering and it has not been run
3. Ensure RLS policies allow public read on `templates`, `node_types`, `stacks`, `template_stacks`

See [Database Schema](database-schema.md).

## Performance Tips

- **Static index**: Build `templates-index.json` at deploy time; avoid runtime generation
- **Supabase**: Use connection pooling for high traffic
- **React Flow**: Large workflows may need virtualization; consider lazy-loading the WorkflowViewer
- **Caching**: TanStack Query caches Supabase responses; consider `staleTime` for filter options

## See Also

- [Setup](setup.md) — Development environment
- [Architecture](architecture.md) — System overview
