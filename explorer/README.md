# n8n Template Explorer

Single Next.js app: **Browse** (static index, tags/services, download ZIP) and **Templates** (Supabase search, node-type filters, React Flow preview, copy JSON).

## Setup

1. **Browse page**
   - From repo root run `npm run build:index` then `npm run copy:index` so `public/templates-index.json` exists. Otherwise the Browse page will fail to load the index.

2. **Environment (for Templates)**
   - Copy `.env.local.example` to `.env.local`.
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your Supabase project (anon key is fine; RLS allows public read on `templates` and `node_types`).

3. **Database**
   - The Supabase schema is applied via migrations (tables `templates`, `node_types` with RLS and search index). Use the same Supabase project that the MCP or migrations target.

3. **Seed data**
   - From repo root: `npm run scrape` to sync from the official n8n API (api.n8n.io), or `npm run scrape:local` to load from local `n8n-workflow-all-templates/**/*.json`. For the scraper, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `scripts/scraper/.env`.

## Run

- `npm run dev` – development (Next.js from `explorer` directory).
- `npm run build` – production build.
- `npm run start` – run production server.

## Deploy (e.g. Vercel)

1. Connect the repo and set the **root directory** to `explorer` (or deploy only the explorer folder).
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Build command: `npm run build`. Output is the default Next.js build.

No server-side secrets are required for the frontend; the anon key is safe to expose and RLS restricts access to read-only template data.
