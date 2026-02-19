# n8n-workflow-all-templates Documentation

> Comprehensive documentation for the n8n workflow template collection, Next.js explorer, and Python scraper.

## Quick Links

| Document | Description |
|----------|-------------|
| [Getting Started](getting-started.md) | Quick start guide for developers |
| [Architecture](architecture.md) | System design and data flow |
| [Setup](setup.md) | Detailed setup and configuration |
| [API Reference](api-reference.md) | Component and hook documentation |
| [Deployment](deployment.md) | Deployment guides (Vercel, CI/CD) |
| [Database Schema](database-schema.md) | Supabase schema and migrations |
| [Enrichment Guide](enrichment-guide.md) | Template analytics enrichment (use case, industries, pricing, serviceable name) |
| [Scraper Guide](scraper-guide.md) | Python scraper documentation |
| [Contributing](contributing.md) | Contribution guidelines |
| [Troubleshooting](troubleshooting.md) | Common issues and solutions |

## Overview

This project provides:

- **7,400+ n8n workflow templates** — the most comprehensive collection available
- **Browse** — static index with tags, service groups, and download (JSON/ZIP)
- **Templates** — Supabase-backed search with node-type filters and React Flow preview
- **Python scraper** — sync from api.n8n.io or load from local JSON into Supabase

## Documentation by Role

### Developers
Start with [Getting Started](getting-started.md), then [Setup](setup.md) and [Architecture](architecture.md). Use [API Reference](api-reference.md) when extending components.

### Contributors
Read [Contributing](contributing.md) for code standards and pull request process. See [Scraper Guide](scraper-guide.md) for template ingestion.

### Technical Stakeholders
See [Architecture](architecture.md) for high-level design and [Deployment](deployment.md) for operational considerations.

### End Users
The root [README](../README.md) covers usage. Browse templates at `/browse` or `/templates` in the deployed explorer.

## See Also

- [Project README](../README.md) — root project overview
- [Explorer README](../explorer/README.md) — explorer setup and deploy
- [n8n Documentation](https://docs.n8n.io/) — n8n workflow automation
