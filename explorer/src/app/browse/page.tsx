"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { FilterBar } from "@/components/browse/FilterBar";
import { SortDropdown } from "@/components/browse/SortDropdown";
import { BrowseTemplateGrid } from "@/components/browse/BrowseTemplateGrid";
import { useIndexTemplates } from "@/hooks/useIndexTemplates";
import { downloadAsZip } from "@/lib/downloadZip";

export default function BrowsePage() {
  const {
    index,
    loading,
    error,
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
  } = useIndexTemplates();

  const handleDownloadZip = useCallback(async () => {
    if (filteredTemplates.length === 0) return;
    await downloadAsZip(filteredTemplates);
  }, [filteredTemplates]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Header />
        <main className="mx-auto flex max-w-7xl items-center justify-center px-6 py-16">
          <p className="text-lg text-zinc-500">Loading templates...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Header />
        <main className="mx-auto flex max-w-7xl items-center justify-center px-6 py-16">
          <p className="text-lg text-red-400">Error: {error}</p>
        </main>
      </div>
    );
  }

  if (!index) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-72">
            <FilterBar
              search={search}
              setSearch={setSearch}
              selectedTags={selectedTags}
              selectedServiceGroups={selectedServiceGroups}
              selectedAgentTags={selectedAgentTags}
              toggleTag={toggleTag}
              toggleServiceGroup={toggleServiceGroup}
              toggleAgentTag={toggleAgentTag}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              tags={index.tags}
            />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500">
                  {filteredTemplates.length.toLocaleString()} of{" "}
                  {index.meta.totalTemplates.toLocaleString()} templates
                </span>
                <SortDropdown value={sort} onChange={setSort} />
              </div>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={filteredTemplates.length === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Download filtered as ZIP ({filteredTemplates.length})
              </button>
            </div>

            <BrowseTemplateGrid templates={filteredTemplates} />
          </div>
        </div>
      </main>
    </div>
  );
}
