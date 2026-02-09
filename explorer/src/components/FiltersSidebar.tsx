"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useNodeTypes } from "@/hooks/useTemplateSearch";

export function FiltersSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nodeTypes = useNodeTypes();
  const selected = useMemo(
    () => new Set(searchParams.get("nodeType")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );

  const toggle = (nodeType: string) => {
    const next = new Set(selected);
    if (next.has(nodeType)) next.delete(nodeType);
    else next.add(nodeType);
    const nextParams = new URLSearchParams(searchParams.toString());
    const val = [...next].join(",");
    if (val) nextParams.set("nodeType", val);
    else nextParams.delete("nodeType");
    router.push(`/templates?${nextParams.toString()}`, { scroll: false });
  };

  if (nodeTypes.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-medium text-zinc-400">Node types</h3>
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-medium text-zinc-400">Node types</h3>
      <ul className="mt-3 space-y-1.5 max-h-80 overflow-y-auto">
        {nodeTypes.map(({ node_type, count }) => (
          <li key={node_type}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(node_type)}
                onChange={() => toggle(node_type)}
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
    </div>
  );
}
