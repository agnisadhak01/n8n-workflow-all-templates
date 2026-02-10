"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SortOption, TemplatesIndex } from "@/types/browse";
import { SERVICE_GROUPS } from "@/data/serviceGroups";

const INDEX_URL = "/templates-index.json";

export function useIndexTemplates() {
  const { data: index, isLoading, error } = useQuery({
    queryKey: ["templates-index"],
    queryFn: async () => {
      const res = await fetch(INDEX_URL);
      if (!res.ok) throw new Error("Failed to load templates index");
      return res.json() as Promise<TemplatesIndex>;
    },
  });

  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedServiceGroups, setSelectedServiceGroups] = useState<string[]>([]);
  const [selectedAgentTags, setSelectedAgentTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("name-asc");

  const filteredTemplates = useMemo(() => {
    if (!index) return [];
    let list = index.templates;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (selectedTags.length > 0) {
      const selectedSet = new Set(selectedTags);
      list = list.filter((t) => {
        const tagSet = new Set(t.tags);
        if (tagSet.size !== selectedSet.size) return false;
        for (const tag of selectedSet) {
          if (!tagSet.has(tag)) return false;
        }
        return true;
      });
    }

    if (selectedServiceGroups.length > 0) {
      list = list.filter((t) =>
        selectedServiceGroups.every((group) => {
          const tags = SERVICE_GROUPS[group] ?? [];
          return tags.some((tag) => t.tags.includes(tag));
        })
      );
    }

    if (selectedAgentTags.length > 0) {
      list = list.filter((t) =>
        selectedAgentTags.some((tag) => t.tags.includes(tag))
      );
    }

    const tagCountMap = new Map(index.tags.map((t) => [t.tag, t.count]));
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "id-asc":
          return Number(a.id) - Number(b.id);
        case "id-desc":
          return Number(b.id) - Number(a.id);
        case "tags-asc":
          return a.tags.length - b.tags.length;
        case "tags-desc":
          return b.tags.length - a.tags.length;
        case "popularity-desc": {
          const scoreA = a.tags.reduce((s, tag) => s + (tagCountMap.get(tag) ?? 0), 0);
          const scoreB = b.tags.reduce((s, tag) => s + (tagCountMap.get(tag) ?? 0), 0);
          return scoreB - scoreA;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [
    index,
    search,
    selectedTags,
    selectedServiceGroups,
    selectedAgentTags,
    sort,
  ]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleServiceGroup = useCallback((group: string) => {
    setSelectedServiceGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  }, []);

  const toggleAgentTag = useCallback((tag: string) => {
    setSelectedAgentTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedTags([]);
    setSelectedServiceGroups([]);
    setSelectedAgentTags([]);
  }, []);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedTags.length > 0 ||
    selectedServiceGroups.length > 0 ||
    selectedAgentTags.length > 0;

  return {
    index,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    search,
    setSearch,
    selectedTags,
    selectedServiceGroups,
    selectedAgentTags,
    sort,
    setSort,
    filteredTemplates,
    toggleTag,
    toggleServiceGroup,
    toggleAgentTag,
    clearFilters,
    hasActiveFilters,
  };
}
