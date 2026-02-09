import { Suspense } from "react";
import { Header } from "@/components/Header";
import { TemplatesContent } from "@/components/TemplatesContent";

export const metadata = {
  title: "Templates | n8n Template Explorer",
  description: "Search and browse n8n workflow templates.",
};

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Suspense fallback={<div className="text-zinc-500">Loading…</div>}>
          <TemplatesContent />
        </Suspense>
      </main>
    </div>
  );
}
