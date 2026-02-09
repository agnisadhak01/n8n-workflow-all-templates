"use client";

import { Suspense } from "react";
import { TemplateGrid } from "./TemplateGrid";
import { SearchBar } from "./SearchBar";
import { FiltersSidebar } from "./FiltersSidebar";

export function TemplatesContent() {
  return (
    <>
      <div className="mb-6">
        <SearchBar />
      </div>
      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <FiltersSidebar />
        </aside>
        <div className="min-w-0 flex-1">
          <Suspense fallback={<div className="text-zinc-500">Loading templates…</div>}>
            <TemplateGrid />
          </Suspense>
        </div>
      </div>
    </>
  );
}
