"use client";

import Link from "next/link";
import type { IndexTemplate } from "@/types/browse";

interface BrowseTemplateCardProps {
  template: IndexTemplate;
}

function downloadJson(template: IndexTemplate) {
  const a = document.createElement("a");
  a.href = template.rawUrl;
  a.download = template.filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.click();
}

async function copyRawUrl(url: string) {
  await navigator.clipboard.writeText(url);
}

export function BrowseTemplateCard({ template }: BrowseTemplateCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-zinc-500">#{template.id}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => downloadJson(template)}
            className="rounded px-2 py-1 text-xs font-medium text-emerald-500 hover:bg-zinc-800"
            title="Download JSON"
          >
            Download
          </button>
          <button
            type="button"
            onClick={() => copyRawUrl(template.rawUrl)}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
            title="Copy raw URL"
          >
            Copy URL
          </button>
          <Link
            href={`/templates/by-source/${template.id}`}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            title="Preview workflow"
          >
            Preview
          </Link>
        </div>
      </div>
      <h3 className="mb-2 line-clamp-2 text-sm font-medium text-zinc-100">
        {template.name}
      </h3>
      <div className="flex flex-wrap gap-1">
        {template.tags.slice(0, 6).map((tag) => (
          <span
            key={tag}
            className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 6 && (
          <span className="text-xs text-zinc-500">+{template.tags.length - 6}</span>
        )}
      </div>
    </div>
  );
}
