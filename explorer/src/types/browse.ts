export interface IndexTemplate {
  id: string;
  name: string;
  filename: string;
  rawUrl: string;
  tags: string[];
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface TemplatesIndex {
  templates: IndexTemplate[];
  tags: TagCount[];
  tagToIds: Record<string, string[]>;
  serviceGroups: Record<string, string[]>;
  meta: {
    totalTemplates: number;
    totalTags: number;
    generatedAt: string;
  };
}

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "id-asc"
  | "id-desc"
  | "tags-asc"
  | "tags-desc"
  | "popularity-desc";
