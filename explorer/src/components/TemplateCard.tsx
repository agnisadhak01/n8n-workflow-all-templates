import Link from "next/link";
import type { Template } from "@/lib/supabase";

function getNodeTypeLabels(nodes: unknown[]): string[] {
  const types = new Set<string>();
  for (const n of Array.isArray(nodes) ? nodes : []) {
    const t = (n as { type?: string }).type;
    if (t) types.add(t.replace(/^n8n-nodes-base\.|^@n8n\//, ""));
  }
  return [...types].slice(0, 6);
}

export function TemplateCard({ template }: { template: Pick<Template, "id" | "title" | "description" | "tags" | "nodes"> }) {
  const labels = getNodeTypeLabels(template.nodes ?? []);
  const tags = (template.tags ?? []).slice(0, 4);
  const desc = template.description?.replace(/\s+/g, " ").slice(0, 120);
  return (
    <Link
      href={`/templates/${template.id}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
    >
      <h3 className="font-semibold text-zinc-100 line-clamp-1">{template.title}</h3>
      {desc && <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{desc}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {tag}
          </span>
        ))}
        {labels.map((l) => (
          <span key={l} className="rounded bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300">
            {l}
          </span>
        ))}
      </div>
    </Link>
  );
}
