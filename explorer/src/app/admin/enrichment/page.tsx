import Link from "next/link";
import { getEnrichmentStatus } from "@/lib/enrich-status";
import { EnrichmentAdminClient } from "./EnrichmentAdminClient";
import { Header } from "@/components/Header";

type Props = {
  searchParams: Promise<{ secret?: string }>;
};

export default async function AdminEnrichmentPage({ searchParams }: Props) {
  const { secret } = await searchParams;
  const expectedSecret = process.env.ENRICHMENT_ADMIN_SECRET;
  const allowed =
    !expectedSecret ||
    (secret !== undefined && secret !== "" && secret === expectedSecret) ||
    process.env.NODE_ENV === "development";

  if (!allowed) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-8 text-center">
            <h1 className="text-xl font-semibold text-zinc-200">Access denied</h1>
            <p className="mt-2 text-zinc-400">
              Provide a valid secret in the URL: /admin/enrichment?secret=...
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-emerald-400 hover:underline"
            >
              Back to home
            </Link>
          </div>
        </main>
      </div>
    );
  }

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
