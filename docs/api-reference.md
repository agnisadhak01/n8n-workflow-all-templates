# API Reference

> Component, hook, and type reference for the Next.js explorer and Python scraper.

## Table of Contents

- [Supabase Client](#supabase-client)
- [TypeScript Types](#typescript-types)
- [React Hooks (Templates)](#react-hooks-templates)
- [React Hooks (Browse)](#react-hooks-browse)
- [Library Functions](#library-functions)
- [Python Scraper Modules](#python-scraper-modules)

## Supabase Client

**File:** `explorer/src/lib/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
```

Returns `null` if env vars are missing (Browse-only mode).

### Template Type

```typescript
export type Template = {
  id: string;
  source_id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  nodes: unknown[];
  raw_workflow: Record<string, unknown>;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  stacks?: { slug: string; label: string }[];
};
```

## TypeScript Types

### Browse Types (`explorer/src/types/browse.ts`)

| Type | Description |
|------|-------------|
| `IndexTemplate` | Single template in static index |
| `TagCount` | Tag with count |
| `TemplatesIndex` | Full static index structure |
| `SortOption` | Sort options for Browse |

```typescript
interface IndexTemplate {
  id: string;
  name: string;
  filename: string;
  rawUrl: string;
  tags: string[];
}

interface TemplatesIndex {
  templates: IndexTemplate[];
  tags: TagCount[];
  tagToIds: Record<string, string[]>;
  serviceGroups: Record<string, string[]>;
  meta: { totalTemplates: number; totalTags: number; generatedAt: string };
}

type SortOption =
  | "name-asc" | "name-desc"
  | "id-asc" | "id-desc"
  | "tags-asc" | "tags-desc"
  | "popularity-desc";
```

### React Flow Types (`explorer/src/lib/n8n-to-reactflow.ts`)

```typescript
interface N8nNode {
  id: string;
  name: string;
  type: string;
  position?: [number, number] | { x: number; y: number };
  parameters?: Record<string, unknown>;
}

interface N8nWorkflow {
  nodes?: N8nNode[];
  connections?: Record<string, Record<string, Array<Array<{ node: string; type?: string; index?: number }>>>>;
}
```

## React Hooks (Templates)

**File:** `explorer/src/hooks/useTemplateSearch.ts`

### useTemplates

```typescript
function useTemplates(
  query: string,
  nodeTypes: string[],
  tags: string[],
  stacks: string[],
  categories: string[],
  page: number
): { data: Template[]; total: number; isLoading: boolean; error: Error | null }
```

Full-text search with filters. Uses Supabase `templates`, `node_types`, `stacks`, `template_stacks`. Returns paginated results (PAGE_SIZE=24).

### useNodeTypes

```typescript
function useNodeTypes(): { node_type: string; count: number }[]
```

Returns node types with template counts, sorted by count descending.

### useTemplateTags

```typescript
function useTemplateTags(): { tag: string; count: number }[]
```

Returns tags with counts, sorted by count and then alphabetically.

### useStacks

```typescript
function useStacks(): { slug: string; label: string; count: number }[]
```

Returns stacks with template counts. Only stacks with count > 0.

### useTemplateCategories

```typescript
function useTemplateCategories(): { category: string; count: number }[]
```

Returns categories with counts from templates.

## React Hooks (Browse)

**File:** `explorer/src/hooks/useIndexTemplates.ts`

### useIndexTemplates

```typescript
function useIndexTemplates(): {
  index: TemplatesIndex | undefined;
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (s: string) => void;
  selectedTags: string[];
  selectedServiceGroups: string[];
  selectedAgentTags: string[];
  sort: SortOption;
  setSort: (s: SortOption) => void;
  filteredTemplates: IndexTemplate[];
  toggleTag: (tag: string) => void;
  toggleServiceGroup: (group: string) => void;
  toggleAgentTag: (tag: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}
```

Loads static index from `/templates-index.json`, applies filters and sort in memory.

## Library Functions

### parseN8nWorkflowToReactFlow

**File:** `explorer/src/lib/n8n-to-reactflow.ts`

```typescript
function parseN8nWorkflowToReactFlow(
  workflow: N8nWorkflow
): { nodes: Node[]; edges: Edge[] }
```

Converts n8n workflow JSON to React Flow `nodes` and `edges`.

### downloadZip

**File:** `explorer/src/lib/downloadZip.ts`

Utility to create and download a ZIP of template JSON files.

## Python Scraper Modules

### run.py

```python
# CLI (non-interactive / CI):
# python run.py [--limit N] [--skip N] [--batch-size N] [--delay SECONDS] [--no-resume] [--dry-run]
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--limit` | int | 0 | Max templates (0 = all) |
| `--skip` | int | 0 | Skip first N |
| `--batch-size` | int | 50 | Templates per batch |
| `--delay` | float | 0.3 | Seconds between requests |
| `--no-resume` | flag | — | Ignore saved state |
| `--dry-run` | flag | — | Fetch/normalize only; no upload |

### normalize.py

```python
def normalize_from_api_payload(api_shape: dict, source_id: str) -> dict | None
```

Normalizes API response to schema: `source_id`, `title`, `description`, `category`, `tags`, `nodes`, `raw_workflow`, `source_url`, `node_type_counts`.

### upload_to_supabase.py

```python
def get_client() -> Client
def upload_template(client: Client, normalized: dict) -> str | None
```

`upload_template` upserts into `templates` (on `source_id`) and replaces `node_types` for the template.

### state.py

```python
def load_state() -> State | None
def save_state(last_source_id: str, total_synced: int, total_errors: int) -> None
```

Persists scraper progress for resumable runs.

## See Also

- [Setup](setup.md) — Environment configuration
- [Database Schema](database-schema.md) — Table structures
- [Scraper Guide](scraper-guide.md) — Scraper usage
