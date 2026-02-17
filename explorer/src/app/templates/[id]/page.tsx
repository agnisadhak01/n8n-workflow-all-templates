import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/Header";
import { WorkflowViewer } from "@/components/WorkflowViewer";
import { JsonExportButton } from "@/components/JsonExportButton";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabase) return { title: "Template | n8n Template Explorer" };
  const { data } = await supabase.from("templates").select("title").eq("id", id).single();
  return {
    title: data?.title ? `${data.title} | n8n Template Explorer` : "Template | n8n Template Explorer",
  };
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabase) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
        <p>Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
      </div>
    );
  }
  const { data: template, error } = await supabase
    .from("templates")
    .select("*, template_stacks:template_stacks(stacks:stacks(slug,label))")
    .eq("id", id)
    .single();
  if (error || !template) notFound();

  const raw = template.raw_workflow as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{template.title}</h1>
            {template.description && (
              <p className="mt-2 max-w-2xl text-zinc-400 line-clamp-2">{template.description}</p>
            )}
            {template.category && (
              <div className="mt-2">
                <a
                  href={`/templates?${new URLSearchParams({ category: String(template.category) }).toString()}`}
                  className="rounded-md bg-amber-900/40 px-2 py-0.5 text-sm text-amber-200 hover:bg-amber-800/60"
                >
                  {template.category}
                </a>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {(template.tags as string[] || []).slice(0, 8).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-zinc-800 px-2 py-0.5 text-sm text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
            {Array.isArray(template.template_stacks) && template.template_stacks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {template.template_stacks.map((ts: any) => {
                  const stack = ts.stacks as { slug: string; label: string } | null;
                  if (!stack) return null;
                  const params = new URLSearchParams();
                  params.set("stacks", stack.slug);
                  return (
                    <a
                      key={stack.slug}
                      href={`/templates?${params.toString()}`}
                      className="rounded-md bg-emerald-900/40 px-2 py-0.5 text-sm text-emerald-200 hover:bg-emerald-800/60"
                    >
                      {stack.label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          <JsonExportButton json={raw} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden" style={{ minHeight: 400 }}>
          <WorkflowViewer workflow={raw} />
        </div>
        {template.source_url && (
          <p className="mt-4 text-sm text-zinc-500">
            Source:{" "}
            <a
              href={template.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:underline"
            >
              {template.source_url}
            </a>
          </p>
        )}
      </main>
    </div>
  );
}
