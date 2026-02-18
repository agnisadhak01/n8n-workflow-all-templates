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
  const [{ data: template, error }, { data: analytics }] = await Promise.all([
    supabase
      .from("templates")
      .select("*, template_stacks:template_stacks(stacks:stacks(slug,label))")
      .eq("id", id)
      .single(),
    supabase
      .from("template_analytics")
      .select("use_case_name, use_case_description, top_2_industries, top_2_processes, final_price_inr")
      .eq("template_id", id)
      .maybeSingle(),
  ]);
  if (error || !template) notFound();

  const raw = template.raw_workflow as Record<string, unknown>;
  const analyticsRow = analytics as {
    use_case_name?: string | null;
    use_case_description?: string | null;
    top_2_industries?: { name: string; confidence?: number }[] | null;
    top_2_processes?: { name: string; confidence?: number }[] | null;
    final_price_inr?: number | null;
  } | null;

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
            {analyticsRow && (
              <div className="mt-4 space-y-2 border-t border-zinc-700/50 pt-4">
                {analyticsRow.use_case_name && analyticsRow.use_case_name !== template.title && (
                  <p className="text-sm text-zinc-300">
                    <span className="text-zinc-500">Use case:</span> {analyticsRow.use_case_name}
                  </p>
                )}
                {analyticsRow.use_case_description && (
                  <p className="text-sm text-zinc-400 max-w-2xl">{analyticsRow.use_case_description}</p>
                )}
                {(analyticsRow.top_2_industries?.length ?? 0) > 0 && (
                  <div>
                    <span className="text-xs text-zinc-500">Top industries:</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {analyticsRow.top_2_industries!.map((item) => (
                        <span
                          key={item.name}
                          className="rounded-md bg-sky-900/40 px-2 py-0.5 text-xs text-sky-200"
                        >
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(analyticsRow.top_2_processes?.length ?? 0) > 0 && (
                  <div>
                    <span className="text-xs text-zinc-500">Top processes:</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {analyticsRow.top_2_processes!.map((item) => (
                        <span
                          key={item.name}
                          className="rounded-md bg-violet-900/40 px-2 py-0.5 text-xs text-violet-200"
                        >
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analyticsRow.final_price_inr != null && (
                  <p className="text-sm text-zinc-400">
                    <span className="text-zinc-500">Price:</span> ₹{Number(analyticsRow.final_price_inr).toLocaleString()} INR
                  </p>
                )}
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
