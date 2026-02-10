"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Template } from "@/lib/supabase";

const PAGE_SIZE = 24;

export function useTemplates(
  query: string,
  nodeTypes: string[],
  tags: string[],
  stacks: string[],
  page: number
): { data: Template[]; total: number; isLoading: boolean; error: Error | null } {
  const { data, isLoading, error } = useQuery({
    queryKey: ["templates", query, nodeTypes.join(","), tags.join(","), stacks.join(","), page],
    queryFn: async () => {
      if (!supabase) return { rows: [], total: 0 };
      let templateIds: string[] | null = null;
      if (nodeTypes.length > 0) {
        const { data: ntRows } = await supabase
          .from("node_types")
          .select("template_id")
          .in("node_type", nodeTypes);
        const ids = [...new Set((ntRows ?? []).map((r: { template_id: string }) => r.template_id))];
        if (ids.length === 0) return { rows: [], total: 0 };
        templateIds = ids;
      }
      if (stacks.length > 0) {
        const { data: stackRows } = await supabase
          .from("stacks")
          .select("id,slug")
          .in("slug", stacks);
        const stackIds = [...new Set((stackRows ?? []).map((r: { id: string }) => r.id))];
        if (stackIds.length === 0) return { rows: [], total: 0 };
        const { data: linkRows } = await supabase
          .from("template_stacks")
          .select("template_id, stack_id")
          .in("stack_id", stackIds);
        const requiredCount = stackIds.length;
        const byTemplate: Record<string, Set<string>> = {};
        for (const r of (linkRows ?? []) as { template_id: string; stack_id: string }[]) {
          if (!byTemplate[r.template_id]) byTemplate[r.template_id] = new Set();
          byTemplate[r.template_id].add(r.stack_id);
        }
        const matchingTemplateIds = Object.entries(byTemplate)
          .filter(([, set]) => set.size === requiredCount)
          .map(([template_id]) => template_id);
        if (matchingTemplateIds.length === 0) return { rows: [], total: 0 };
        templateIds = templateIds ? templateIds.filter((id) => matchingTemplateIds.includes(id)) : matchingTemplateIds;
        if (templateIds.length === 0) return { rows: [], total: 0 };
      }
      let q = supabase
        .from("templates")
        .select("id,source_id,title,description,category,tags,nodes,source_url,template_stacks:template_stacks(stacks:stacks(slug,label))", {
          count: "exact",
        });
      if (templateIds?.length) q = q.in("id", templateIds);
      if (tags.length > 0) {
        // exact tag-set matching: template.tags must contain and be contained by selected tags
        q = q.contains("tags", tags).containedBy("tags", tags);
      }
      if (query.trim()) {
        q = q.textSearch("search_vector", query.trim(), { type: "websearch", config: "english" });
      }
      const from = (page - 1) * PAGE_SIZE;
      const { data: rows, count, error: e } = await q
        .range(from, from + PAGE_SIZE - 1)
        .order("updated_at", { ascending: false });
      if (e) throw e;
      const mappedRows =
        (rows ?? []).map((row: any) => ({
          ...row,
          stacks: (row.template_stacks ?? [])
            .map((ts: any) => ts.stacks)
            .filter(Boolean),
        })) ?? [];
      return { rows: mappedRows, total: count ?? 0 };
    },
    enabled: !!supabase,
  });
  return {
    data: (data?.rows ?? []) as Template[],
    total: data?.total ?? 0,
    isLoading,
    error: error as Error | null,
  };
}

export function useNodeTypes(): { node_type: string; count: number }[] {
  const { data } = useQuery({
    queryKey: ["nodeTypes"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data: rows, error } = await supabase.from("node_types").select("template_id, node_type");
      if (error || !rows) return [];
      const byType: Record<string, Set<string>> = {};
      for (const r of rows as { template_id: string; node_type: string }[]) {
        if (!byType[r.node_type]) byType[r.node_type] = new Set();
        byType[r.node_type].add(r.template_id);
      }
      return Object.entries(byType)
        .map(([node_type, set]) => ({ node_type, count: set.size }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!supabase,
  });
  return data ?? [];
}

export function useTemplateTags(): { tag: string; count: number }[] {
  const { data } = useQuery({
    queryKey: ["templateTags"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data: rows, error } = await supabase.from("templates").select("tags");
      if (error || !rows) return [];
      const counts = new Map<string, number>();
      for (const row of rows as { tags: string[] | null }[]) {
        for (const tag of row.tags ?? []) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.tag.localeCompare(b.tag);
        });
    },
    enabled: !!supabase,
  });
  return data ?? [];
}

export function useStacks(): { slug: string; label: string; count: number }[] {
  const { data } = useQuery({
    queryKey: ["stacks"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data: stacks, error: stacksError } = await supabase
        .from("stacks")
        .select("id, slug, label");
      if (stacksError || !stacks) return [];
      const { data: links, error: linksError } = await supabase
        .from("template_stacks")
        .select("template_id, stack_id");
      if (linksError || !links) return [];
      const counts = new Map<string, number>();
      for (const link of links as { template_id: string; stack_id: string }[]) {
        counts.set(link.stack_id, (counts.get(link.stack_id) ?? 0) + 1);
      }
      return (stacks as { id: string; slug: string; label: string }[])
        .map((s) => ({
          slug: s.slug,
          label: s.label,
          count: counts.get(s.id) ?? 0,
        }))
        .filter((s) => s.count > 0)
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.label.localeCompare(b.label);
        });
    },
    enabled: !!supabase,
  });
  return data ?? [];
}
