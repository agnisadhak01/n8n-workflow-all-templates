"use client";

import { useSearchParams } from "next/navigation";
import { useTemplates } from "@/hooks/useTemplateSearch";
import { TemplateCard } from "./TemplateCard";

export function TemplateGrid() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const nodeTypes = (searchParams.get("nodeType") ?? "").split(",").filter(Boolean);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const { data, total, isLoading, error } = useTemplates(q, nodeTypes, page);
  const totalPages = Math.ceil(total / 24) || 1;

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-red-300">
        {error.message}
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-800/50" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
        No templates found. Try changing search or filters.
      </div>
    );
  }
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={`/templates?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) }).toString()}`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Previous
            </a>
          )}
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/templates?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) }).toString()}`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
