# Contributing

> Guidelines for contributing to n8n-workflow-all-templates.

## Table of Contents

- [Code Standards](#code-standards)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Project-Specific Checklist](#project-specific-checklist)

## Code Standards

### TypeScript / React

- Use TypeScript for all new code
- Follow existing patterns in `explorer/src/`
- Use functional components and hooks
- Prefer named exports for components and utilities

### Python

- Use Python 3.10+ features
- Add type hints where practical
- Follow PEP 8 for style
- Use `pathlib.Path` for file operations

### Naming

- **Components**: PascalCase (e.g., `TemplateCard`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTemplateSearch`)
- **Files**: Match the primary export (e.g., `TemplateCard.tsx`)
- **Functions/variables**: camelCase (TS/JS) or snake_case (Python)

## Development Workflow

### 1. Fork and Clone

```bash
git clone https://github.com/your-username/n8n-workflow-all-templates.git
cd n8n-workflow-all-templates
npm install
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes

- Run `npm run dev` for the explorer
- Run `npm run build:index && npm run copy:index` if modifying Browse data
- Ensure the project builds: `cd explorer && npm run build`

### 4. Test

- Manually verify Browse and Templates pages
- If adding scraper logic, run `npm run scrape -- --limit 5 --dry-run`

### 5. Commit

Use clear, descriptive commit messages:

```
feat: add node-type filter to Templates page
fix: handle missing template description
docs: update setup instructions
```

## Pull Request Process

1. **Update from main** — Rebase or merge latest `main` before submitting
2. **Description** — Explain the change, link related issues
3. **Scope** — Prefer smaller, focused PRs
4. **Checklist** — Ensure:
   - [ ] Code follows project conventions
   - [ ] Explorer builds successfully
   - [ ] No unnecessary dependencies added
   - [ ] Documentation updated if needed

## Issue Reporting

When opening an issue:

- **Bug**: Describe steps to reproduce, expected vs actual behavior, environment
- **Feature**: Describe the use case and proposed solution
- **Documentation**: Specify the doc and what is unclear or missing

## Project-Specific Checklist

Before submitting:

- [ ] `templates-index.json` exists in `explorer/public/` for Browse (run `npm run build:index && npm run copy:index` if needed)
- [ ] Supabase env vars set for Templates: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Scraper `.env` configured for `npm run scrape` if testing ingestion

## Areas for Contribution

- **Explorer**: New filters, UI improvements, accessibility
- **Scraper**: Robustness, rate limiting, normalization rules
- **Documentation**: Clarifications, examples, translations
- **Templates**: Adding or curating workflow templates (see repo structure)

## See Also

- [Getting Started](getting-started.md)
- [Setup](setup.md)
- [Architecture](architecture.md)
