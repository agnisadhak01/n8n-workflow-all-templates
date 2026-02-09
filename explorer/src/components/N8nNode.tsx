"use client";

import { memo } from "react";
import type { NodeProps } from "reactflow";

const typeColors: Record<string, string> = {
  "n8n-nodes-base.webhook": "bg-amber-900/60 border-amber-600",
  "n8n-nodes-base.httpRequest": "bg-blue-900/60 border-blue-600",
  "n8n-nodes-base.code": "bg-violet-900/60 border-violet-600",
  "n8n-nodes-base.stickyNote": "bg-zinc-800/80 border-zinc-600",
  "n8n-nodes-base.if": "bg-cyan-900/60 border-cyan-600",
  "n8n-nodes-base.switch": "bg-teal-900/60 border-teal-600",
  "n8n-nodes-base.merge": "bg-orange-900/60 border-orange-600",
  "n8n-nodes-base.set": "bg-sky-900/60 border-sky-600",
  "n8n-nodes-base.postgres": "bg-emerald-900/60 border-emerald-600",
  "n8n-nodes-base.googleSheets": "bg-green-900/60 border-green-600",
  "n8n-nodes-base.gmail": "bg-red-900/60 border-red-600",
  "n8n-nodes-base.slack": "bg-purple-900/60 border-purple-600",
  "n8n-nodes-base.telegram": "bg-indigo-900/60 border-indigo-600",
  "n8n-nodes-base.openAi": "bg-lime-900/60 border-lime-600",
  "n8n-nodes-base.manualTrigger": "bg-yellow-900/60 border-yellow-600",
};

function getStyle(type: string): string {
  if (typeColors[type]) return typeColors[type];
  if (type.includes("trigger") || type.includes("Trigger")) return "bg-amber-900/60 border-amber-600";
  if (type.includes("langchain") || type.includes("agent")) return "bg-violet-900/60 border-violet-600";
  return "bg-zinc-800 border-zinc-600";
}

function N8nNodeComponent({ data }: NodeProps) {
  const label = (data.label as string) ?? "Node";
  const nodeType = (data.nodeType as string) ?? "";
  const shortType = nodeType.replace(/^n8n-nodes-base\.|^@n8n\//, "");
  const style = getStyle(nodeType);
  const isNote = nodeType.includes("stickyNote");
  return (
    <div
      className={`min-w-[140px] rounded-lg border px-3 py-2 shadow-lg ${style}`}
      style={isNote ? { maxWidth: 320, whiteSpace: "pre-wrap" } : undefined}
    >
      <div className="text-xs font-medium text-zinc-400 truncate" title={nodeType}>
        {shortType || "Node"}
      </div>
      <div className="mt-0.5 truncate text-sm font-medium text-zinc-100">{label}</div>
    </div>
  );
}

export const N8nNode = memo(N8nNodeComponent);
