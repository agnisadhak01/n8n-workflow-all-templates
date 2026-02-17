# Getting Started

> Quick start guide for developers working on n8n-workflow-all-templates.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Python** 3.10+
- **npm** or **pnpm**
- (Optional) **Supabase** account for Templates page

## 5-Minute Setup

### 1. Clone and Install

```bash
git clone https://github.com/zengfr/n8n-workflow-all-templates.git
cd n8n-workflow-all-templates
npm install
```

### 2. Build the Static Index (for Browse)

```bash
npm run build:index
npm run copy:index
```

This generates `explorer/public/templates-index.json` from the workflow JSON files.

### 3. Run the Explorer

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The **Browse** page at `/browse` will work with the static index.

### 4. (Optional) Enable Templates Page

For full-text search, node-type filters, and workflow preview:

1. Create a [Supabase](https://supabase.com) project
2. Apply the database migrations (see [Setup](setup.md#supabase-database))
3. Copy `explorer/.env.local.example` to `explorer/.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Run the scraper: `npm run scrape` or `npm run scrape:local`

See [Setup](setup.md) for full details.

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js explorer |
| `npm run build:index` | Build templates-index.json |
| `npm run copy:index` | Copy index to explorer/public |
| `npm run scrape` | Sync from api.n8n.io to Supabase |
| `npm run scrape:local` | Load local JSON into Supabase |
| `npm run enrich:metadata` | AI-assisted metadata enrichment |

## Project Structure

```
n8n-workflow-all-templates/
├── explorer/           # Next.js app (Browse + Templates)
├── scripts/
│   ├── build-index.js  # Build static index
│   ├── copy-index.js   # Copy index to explorer
│   └── scraper/        # Python scraper
├── n8n-workflow-all-templates/  # 7400+ workflow JSON files
├── tags/               # Tag markdown files
└── webapp/             # Legacy Vite app
```

## Next Steps

- [Setup](setup.md) — Detailed configuration and environment variables
- [Architecture](architecture.md) — System design and data flow
- [Scraper Guide](scraper-guide.md) — Template ingestion pipeline
