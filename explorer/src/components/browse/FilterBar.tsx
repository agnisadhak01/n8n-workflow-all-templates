"use client";

import { useState } from "react";
import { SERVICE_GROUPS, AGENT_TAGS } from "@/data/serviceGroups";
import type { TagCount } from "@/types/browse";

const TAG_SHOW_LIMIT = 30;

interface FilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  selectedTags: string[];
  selectedServiceGroups: string[];
  selectedAgentTags: string[];
  toggleTag: (tag: string) => void;
  toggleServiceGroup: (group: string) => void;
  toggleAgentTag: (tag: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  tags: TagCount[];
}

export function FilterBar({
  search,
  setSearch,
  selectedTags,
  selectedServiceGroups,
  selectedAgentTags,
  toggleTag,
  toggleServiceGroup,
  toggleAgentTag,
  clearFilters,
  hasActiveFilters,
  tags,
}: FilterBarProps) {
  const [tagSearch, setTagSearch] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);

  const filteredTags = tagSearch.trim()
    ? tags.filter((t) => t.tag.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags;
  const displayedTags = showAllTags ? filteredTags : filteredTags.slice(0, TAG_SHOW_LIMIT);
  const hasMoreTags = filteredTags.length > TAG_SHOW_LIMIT;

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-400">Search</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or tag..."
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-400">Services</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(SERVICE_GROUPS).map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => toggleServiceGroup(group)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedServiceGroups.includes(group)
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-400">
          Agents & Automation
        </label>
        <div className="flex flex-wrap gap-2">
          {AGENT_TAGS.filter((t) => tags.some((tc) => tc.tag === t)).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleAgentTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedAgentTags.includes(tag)
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-400">Tags</label>
        <input
          type="text"
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          placeholder="Filter tags..."
          className="mb-2 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
        <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
          {displayedTags.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded px-2 py-0.5 text-xs ${
                selectedTags.includes(tag)
                  ? "bg-emerald-900/60 font-medium text-emerald-300"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
              title={`${count} templates`}
            >
              {tag} ({count})
            </button>
          ))}
        </div>
        {hasMoreTags && (
          <button
            type="button"
            onClick={() => setShowAllTags(!showAllTags)}
            className="mt-2 text-xs text-emerald-500 hover:underline"
          >
            {showAllTags ? "Show less" : `Show all ${filteredTags.length} tags`}
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full rounded bg-zinc-800 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
