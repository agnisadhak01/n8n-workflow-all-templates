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
};
