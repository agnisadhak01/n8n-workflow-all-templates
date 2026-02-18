import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

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

/** Industry or process item from template_analytics (top_2_industries, top_2_processes) */
export type ClassifiedItem = {
  name: string;
  confidence?: number;
};

/** Analytics row for a template (from template_analytics) */
export type TemplateAnalytics = {
  use_case_name: string | null;
  use_case_description: string | null;
  top_2_industries: ClassifiedItem[] | null;
  top_2_processes: ClassifiedItem[] | null;
  final_price_inr: number | null;
};
