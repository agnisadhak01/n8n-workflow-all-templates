"use client";

import { useState } from "react";
import { getStatus, runEnrichment, runScraper } from "./actions";
import type { EnrichmentStatus } from "@/lib/enrich-status";

type Props = {
  initialStatus: EnrichmentStatus;
};

export function EnrichmentAdminClient({ initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [runMessage, setRunMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [scraperMessage, setScraperMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setRunMessage(null);
    setScraperMessage(null);
    const result = await getStatus();
    if (result.ok) setStatus(result.data);
    setLoading(false);
  }

  async function handleRun() {
    setLoading(true);
    setRunMessage(null);
    const result = await runEnrichment();
    setLoading(false);
    if (result.ok) {
      setRunMessage({
        type: "ok",
        text: "Enrichment started in background. Use Refresh to monitor progress.",
      });
    } else {
      setRunMessage({ type: "error", text: result.error ?? "Failed to start" });
    }
  }

  async function handleRunScraper() {
    setLoading(true);
    setScraperMessage(null);
    const result = await runScraper();
    setLoading(false);
    if (result.ok) {
      setScraperMessage({
        type: "ok",
        text: "Template fetch started in background. Use Refresh to see updated template count.",
      });
    } else {
      setScraperMessage({ type: "error", text: result.error ?? "Failed to start" });
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <p className="text-sm text-zinc-400">Total templates</p>
          <p className="mt-1 text-2xl font-semibold">{status.totalTemplates.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <p className="text-sm text-zinc-400">Enriched</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400">
            {status.enrichedCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <p className="text-sm text-zinc-400">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-400">
            {status.pendingCount.toLocaleString()}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Template fetch (scraper)</h2>
        <p className="mb-3 text-sm text-zinc-400">
          Fetch templates from api.n8n.io and upsert into the <code className="rounded bg-zinc-700 px-1">templates</code> table.
        </p>
        {scraperMessage && (
          <div
            className={`mb-3 rounded-lg border p-4 ${
              scraperMessage.type === "ok"
                ? "border-emerald-700 bg-emerald-900/20 text-emerald-200"
                : "border-red-800 bg-red-900/20 text-red-200"
            }`}
          >
            {scraperMessage.text}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRunScraper}
            disabled={loading}
            className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? "Starting…" : "Run scraper"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Analytics enrichment</h2>
        <p className="mb-3 text-sm text-zinc-400">
          Enrich <code className="rounded bg-zinc-700 px-1">template_analytics</code> (use case, pricing, industries, etc.).
        </p>
        {runMessage && (
          <div
            className={`mb-3 rounded-lg border p-4 ${
              runMessage.type === "ok"
                ? "border-emerald-700 bg-emerald-900/20 text-emerald-200"
                : "border-red-800 bg-red-900/20 text-red-200"
            }`}
          >
            {runMessage.text}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Starting…" : "Run enrichment"}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-lg bg-zinc-700 px-4 py-2 font-medium text-zinc-100 transition hover:bg-zinc-600 disabled:opacity-50"
        >
          Refresh status
        </button>
      </div>
    </div>
  );
}
