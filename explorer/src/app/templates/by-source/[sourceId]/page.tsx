import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default async function BySourcePage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  if (!supabase) notFound();
  const { data, error } = await supabase
    .from("templates")
    .select("id")
    .eq("source_id", sourceId)
    .maybeSingle();
  if (error || !data) notFound();
  redirect(`/templates/${data.id}`);
}
