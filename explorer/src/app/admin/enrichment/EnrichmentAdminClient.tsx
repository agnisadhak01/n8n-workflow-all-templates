"use client";

import { useState, useEffect } from "react";
import { getStatus, getHistory, runEnrichment, runScraper } from "./actions";
import type { EnrichmentStatus } from "@/lib/enrich-status";
import type { JobRunRow } from "@/lib/admin-jobs";

type Props = {
  initialStatus: EnrichmentStatus;
};

const STALE_HOURS = 2;

function formatResult(row: JobRunRow): string {
  if (!row.result) return "—";
  const r = row.result as Record<string, number | undefined>;
  if (row.job_type === "enrichment") {
    const enriched = r.enriched_count ?? 0;
    const failed = r.failed_count ?? 0;
    return `${enriched.toLocaleString()} enriched, ${failed.toLocaleString()} failed`;
  }
  const ok = r.templates_ok ?? 0;
  const err = r.templates_error ?? 0;
  return `${ok.toLocaleString()} ok, ${err.toLocaleString()} errors`;
}

function formatDuration(started: string, completed: string | null): string {
  if (!completed) return "—";
  const a = new Date(started).getTime();
  const b = new Date(completed).getTime();
  const sec = Math.round((b - a) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  if (min < 60) return `${min}m ${s}s`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m ${s}s`;
}

function isStale(startedAt: string, status: string): boolean {
  if (status !== "running") return false;
  const started = new Date(startedAt).getTime();
  return Date.now() - started > STALE_HOURS * 60 * 60 * 1000;
}

type RunInsights = {
  totalEnriched: number;
  totalFailed: number;
  runCount: number;
  lastRunSummary: string | null;
};

function enrichmentInsights(rows: JobRunRow[]): RunInsights {
  let totalEnriched = 0;
  let totalFailed = 0;
  let lastRunSummary: string | null = null;
  const completed = rows.filter((r) => r.status === "completed" && r.result);
  for (const row of completed) {
    const r = (row.result || {}) as Record<string, number | undefined>;
    totalEnriched += r.enriched_count ?? 0;
    totalFailed += r.failed_count ?? 0;
  }
  const last = completed[completed.length - 1];
  if (last?.result) {
    const r = last.result as Record<string, number | undefined>;
    lastRunSummary = `${(r.enriched_count ?? 0).toLocaleString()} enriched, ${(r.failed_count ?? 0).toLocaleString()} failed`;
  }
  return { totalEnriched, totalFailed, runCount: rows.length, lastRunSummary };
}

type ScraperInsights = {
  totalTemplatesAdded: number;
  totalErrors: number;
  runCount: number;
  lastRunSummary: string | null;
};

function scraperInsights(rows: JobRunRow[]): ScraperInsights {
  let totalTemplatesAdded = 0;
  let totalErrors = 0;
  let lastRunSummary: string | null = null;
  const completed = rows.filter((r) => r.status === "completed" && r.result);
  for (const row of completed) {
    const r = (row.result || {}) as Record<string, number | undefined>;
    totalTemplatesAdded += r.templates_ok ?? 0;
    totalErrors += r.templates_error ?? 0;
  }
  const last = completed[completed.length - 1];
  if (last?.result) {
    const r = last.result as Record<string, number | undefined>;
    lastRunSummary = `${(r.templates_ok ?? 0).toLocaleString()} added, ${(r.templates_error ?? 0).toLocaleString()} errors`;
  }
  return { totalTemplatesAdded, totalErrors, runCount: rows.length, lastRunSummary };
}

function HistoryTable({
  rows,
  emptyLabel,
  variant,
}: {
  rows: JobRunRow[];
  emptyLabel: string;
  variant: "enrichment" | "scraper";
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }
  const r = (row: JobRunRow) => (row.result || {}) as Record<string, number | undefined>;
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800/80">
            <th className="p-3 font-medium text-zinc-300">Started</th>
            <th className="p-3 font-medium text-zinc-300">Completed</th>
            <th className="p-3 font-medium text-zinc-300">Duration</th>
            {variant === "enrichment" ? (
              <>
                <th className="p-3 font-medium text-zinc-300">Enriched</th>
                <th className="p-3 font-medium text-zinc-300">Failed</th>
              </>
            ) : (
              <>
                <th className="p-3 font-medium text-zinc-300">Templates added</th>
                <th className="p-3 font-medium text-zinc-300">Errors</th>
              </>
            )}
            <th className="p-3 font-medium text-zinc-300">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-700/50">
              <td className="p-3 text-zinc-200">
                {new Date(row.started_at).toLocaleString()}
              </td>
              <td className="p-3 text-zinc-400">
                {row.completed_at
                  ? new Date(row.completed_at).toLocaleString()
                  : "—"}
              </td>
              <td className="p-3 text-zinc-400">
                {formatDuration(row.started_at, row.completed_at)}
              </td>
              {variant === "enrichment" ? (
                <>
                  <td className="p-3 text-emerald-400">
                    {row.result != null && typeof r(row).enriched_count === "number"
                      ? r(row).enriched_count!.toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-3 text-red-400">
                    {row.result != null && typeof r(row).failed_count === "number"
                      ? r(row).failed_count!.toLocaleString()
                      : "—"}
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3 text-sky-400">
                    {row.result != null && typeof r(row).templates_ok === "number"
                      ? r(row).templates_ok!.toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-3 text-red-400">
                    {row.result != null && typeof r(row).templates_error === "number"
                      ? r(row).templates_error!.toLocaleString()
                      : "—"}
                  </td>
                </>
              )}
              <td className="p-3">
                <span
                  className={
                    row.status === "completed"
                      ? "text-emerald-400"
                      : row.status === "failed"
                        ? "text-red-400"
                        : "text-amber-400"
                  }
                >
                  {row.status === "running" ? "Running…" : row.status}
                </span>
                {isStale(row.started_at, row.status) && (
                  <span className="ml-2 text-xs text-zinc-500">(Stale)</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EnrichmentAdminClient({ initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [runMessage, setRunMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [scraperMessage, setScraperMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [history, setHistory] = useState<{
    enrichment: JobRunRow[];
    scraper: JobRunRow[];
  }>({ enrichment: [], scraper: [] });

  async function loadHistory() {
    const result = await getHistory();
    if (result.ok) setHistory(result.data);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleRefresh() {
    setLoading(true);
    setRunMessage(null);
    setScraperMessage(null);
    const [statusResult, historyResult] = await Promise.all([
      getStatus(),
      getHistory(),
    ]);
    if (statusResult.ok) setStatus(statusResult.data);
    if (historyResult.ok) setHistory(historyResult.data);
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
      loadHistory();
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
      loadHistory();
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

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Insights (from run history)</h2>
        <p className="mb-4 text-sm text-zinc-400">
          Totals and last-run summaries from recorded enrichment and template-fetch runs.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <h3 className="text-sm font-medium text-zinc-300">Enrichment (script run sessions)</h3>
            {(() => {
              const ins = enrichmentInsights(history.enrichment);
              return (
                <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                  <li>Total enriched (all runs): <strong className="text-emerald-400">{ins.totalEnriched.toLocaleString()}</strong></li>
                  <li>Total failed (all runs): <strong className="text-red-400">{ins.totalFailed.toLocaleString()}</strong></li>
                  <li>Run sessions: {ins.runCount.toLocaleString()}</li>
                  {ins.lastRunSummary && (
                    <li className="pt-1 text-zinc-400">Last run: {ins.lastRunSummary}</li>
                  )}
                </ul>
              );
            })()}
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <h3 className="text-sm font-medium text-zinc-300">Template fetch (script run sessions)</h3>
            {(() => {
              const ins = scraperInsights(history.scraper);
              return (
                <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                  <li>Templates added (all runs): <strong className="text-sky-400">{ins.totalTemplatesAdded.toLocaleString()}</strong></li>
                  <li>Errors (all runs): <strong className="text-red-400">{ins.totalErrors.toLocaleString()}</strong></li>
                  <li>Run sessions: {ins.runCount.toLocaleString()}</li>
                  {ins.lastRunSummary && (
                    <li className="pt-1 text-zinc-400">Last run: {ins.lastRunSummary}</li>
                  )}
                </ul>
              );
            })()}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Full Enrichment history</h2>
        <p className="mb-2 text-xs text-zinc-500">Chronological order (oldest first).</p>
        <HistoryTable rows={history.enrichment} emptyLabel="No runs yet." variant="enrichment" />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Full Data fetching history</h2>
        <p className="mb-2 text-xs text-zinc-500">Chronological order (oldest first).</p>
        <HistoryTable rows={history.scraper} emptyLabel="No runs yet." variant="scraper" />
      </section>
    </div>
  );
}
