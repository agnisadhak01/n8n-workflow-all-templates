"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BrowseTemplateCard } from "./BrowseTemplateCard";
import type { IndexTemplate } from "@/types/browse";

interface BrowseTemplateGridProps {
  templates: IndexTemplate[];
}

const COLUMNS = 4;
const ROW_HEIGHT = 160;
const OVERSCAN = 3;

export function BrowseTemplateGrid({ templates }: BrowseTemplateGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rows = Math.ceil(templates.length / COLUMNS);

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-12rem)] overflow-auto rounded-lg border border-zinc-800 bg-zinc-900/30"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const startIdx = virtualRow.index * COLUMNS;
          const rowTemplates = templates.slice(startIdx, startIdx + COLUMNS);
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-1 gap-4 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {rowTemplates.map((template) => (
                <BrowseTemplateCard key={template.id} template={template} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
