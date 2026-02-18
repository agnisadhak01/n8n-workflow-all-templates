import Link from "next/link";
import { getEnrichmentStatus } from "@/lib/enrich-status";
import { EnrichmentAdminClient } from "./EnrichmentAdminClient";
import { Header } from "@/components/Header";

export default async function AdminEnrichmentPage() {
  const statusResult = await getEnrichmentStatus();
  if ("error" in statusResult) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-8 text-red-200">
            <p>Failed to load status: {statusResult.error}</p>
            <Link href="/" className="mt-4 inline-block text-emerald-400 hover:underline">
              Back to home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Enrichment admin</h1>
          <p className="mt-1 text-zinc-400">
            Trigger template fetch (scraper) and analytics enrichment; monitor status.
          </p>
        </div>
        <EnrichmentAdminClient initialStatus={statusResult} />
      </main>
    </div>
  );
}
