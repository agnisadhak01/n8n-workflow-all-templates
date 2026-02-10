"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useNodeTypes, useTemplateTags } from "@/hooks/useTemplateSearch";

export function FiltersSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nodeTypes = useNodeTypes();
  const templateTags = useTemplateTags();
  const selectedNodeTypes = useMemo(
    () => new Set(searchParams.get("nodeType")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const selectedTags = useMemo(
    () => new Set(searchParams.get("tags")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const [tagSearch, setTagSearch] = useState("");

  const toggleNodeType = (nodeType: string) => {
    const next = new Set(selectedNodeTypes);
    if (next.has(nodeType)) next.delete(nodeType);
    else next.add(nodeType);
    const nextParams = new URLSearchParams(searchParams.toString());
    const val = [...next].join(",");
    if (val) nextParams.set("nodeType", val);
    else nextParams.delete("nodeType");
    nextParams.delete("page");
    router.push(`/templates?${nextParams.toString()}`, { scroll: false });
  };

  const toggleTag = (tag: string) => {
    const next = new Set(selectedTags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    const nextParams = new URLSearchParams(searchParams.toString());
    const val = [...next].join(",");
    if (val) nextParams.set("tags", val);
    else nextParams.delete("tags");
    nextParams.delete("page");
    router.push(`/templates?${nextParams.toString()}`, { scroll: false });
  };

  const filteredTags = (tagSearch.trim()
    ? templateTags.filter((t) => t.tag.toLowerCase().includes(tagSearch.toLowerCase()))
    : templateTags
  ).slice(0, 100);

  if (nodeTypes.length === 0 && templateTags.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-medium text-zinc-400">Filters</h3>
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-medium text-zinc-400">Node types</h3>
      <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
        {nodeTypes.map(({ node_type, count }) => (
          <li key={node_type}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedNodeTypes.has(node_type)}
                onChange={() => toggleNodeType(node_type)}
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="truncate text-zinc-300" title={node_type}>
                {node_type.replace(/^n8n-nodes-base\.|^@n8n\//, "")}
              </span>
              <span className="text-zinc-500">({count})</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-zinc-400">Tags (exact match)</h3>
        <input
          type="text"
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          placeholder="Filter tags…"
          className="mt-2 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
        <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
          {filteredTags.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded px-2 py-0.5 text-xs ${
                selectedTags.has(tag)
                  ? "bg-emerald-900/60 font-medium text-emerald-300"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
              title={`${count} templates`}
            >
              {tag} ({count})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
