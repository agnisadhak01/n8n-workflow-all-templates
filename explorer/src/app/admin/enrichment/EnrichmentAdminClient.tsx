"use client";

import { useState, useEffect } from "react";
import { getStatus, getHistory, runEnrichment, runScraper, runTop2Enrichment } from "./actions";
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
  if (row.job_type === "top2") {
    const processed = r.processed_count ?? 0;
    const failed = r.failed_count ?? 0;
    return `${processed.toLocaleString()} processed, ${failed.toLocaleString()} failed`;
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

type Top2Insights = {
  totalProcessed: number;
  totalFailed: number;
  runCount: number;
  lastRunSummary: string | null;
};

function top2Insights(rows: JobRunRow[]): Top2Insights {
  let totalProcessed = 0;
  let totalFailed = 0;
  let lastRunSummary: string | null = null;
  const completed = rows.filter((r) => r.status === "completed" && r.result);
  for (const row of completed) {
    const r = (row.result || {}) as Record<string, number | undefined>;
    totalProcessed += r.processed_count ?? 0;
    totalFailed += r.failed_count ?? 0;
  }
  const last = completed[completed.length - 1];
  if (last?.result) {
    const r = last.result as Record<string, number | undefined>;
    lastRunSummary = `${(r.processed_count ?? 0).toLocaleString()} processed, ${(r.failed_count ?? 0).toLocaleString()} failed`;
  }
  return { totalProcessed, totalFailed, runCount: rows.length, lastRunSummary };
}

function HistoryTable({
  rows,
  emptyLabel,
  variant,
}: {
  rows: JobRunRow[];
  emptyLabel: string;
  variant: "enrichment" | "scraper" | "top2";
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
            {variant === "enrichment" && (
              <>
                <th className="p-3 font-medium text-zinc-300">Enriched</th>
                <th className="p-3 font-medium text-zinc-300">Failed</th>
              </>
            )}
            {variant === "scraper" && (
              <>
                <th className="p-3 font-medium text-zinc-300">Templates added</th>
                <th className="p-3 font-medium text-zinc-300">Errors</th>
              </>
            )}
            {variant === "top2" && (
              <>
                <th className="p-3 font-medium text-zinc-300">Processed</th>
                <th className="p-3 font-medium text-zinc-300">Failed</th>
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
              {variant === "enrichment" && (
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
              )}
              {variant === "scraper" && (
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
              {variant === "top2" && (
                <>
                  <td className="p-3 text-violet-400">
                    {row.result != null && typeof r(row).processed_count === "number"
                      ? r(row).processed_count!.toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-3 text-red-400">
                    {row.result != null && typeof r(row).failed_count === "number"
                      ? r(row).failed_count!.toLocaleString()
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
  const [top2Message, setTop2Message] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [history, setHistory] = useState<{
    enrichment: JobRunRow[];
    scraper: JobRunRow[];
    top2: JobRunRow[];
  }>({ enrichment: [], scraper: [], top2: [] });

  const [scraperParams, setScraperParams] = useState({
    batchSize: 50,
    delay: 0.3,
    limit: 0,
  });
  const [enrichmentParams, setEnrichmentParams] = useState({
    batchSize: 100,
    limit: 0,
  });
  const [top2Params, setTop2Params] = useState({
    batchSize: 50,
    limit: 0,
    refresh: false,
  });

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
    setTop2Message(null);
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
    const result = await runEnrichment({
      batchSize: enrichmentParams.batchSize,
      limit: enrichmentParams.limit || undefined,
    });
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
    const result = await runScraper({
      batchSize: scraperParams.batchSize,
      delay: scraperParams.delay,
      limit: scraperParams.limit || undefined,
    });
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

  async function handleRunTop2() {
    setLoading(true);
    setTop2Message(null);
    const result = await runTop2Enrichment({
      batchSize: top2Params.batchSize,
      limit: top2Params.limit || undefined,
      refresh: top2Params.refresh,
    });
    setLoading(false);
    if (result.ok) {
      setTop2Message({
        type: "ok",
        text: "Top-2 classifier started in background. Use Refresh to see updated template detail.",
      });
      loadHistory();
    } else {
      setTop2Message({ type: "error", text: result.error ?? "Failed to start" });
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
        <div className="mb-3 flex flex-wrap items-end gap-4 rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Batch size</span>
            <input
              type="number"
              min={1}
              max={500}
              value={scraperParams.batchSize}
              onChange={(e) =>
                setScraperParams((p) => ({ ...p, batchSize: Math.max(1, parseInt(e.target.value, 10) || 50) }))
              }
              className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Delay (sec)</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={scraperParams.delay}
              onChange={(e) =>
                setScraperParams((p) => ({ ...p, delay: Math.max(0, parseFloat(e.target.value) || 0) }))
              }
              className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Limit (0 = all)</span>
            <input
              type="number"
              min={0}
              value={scraperParams.limit}
              onChange={(e) =>
                setScraperParams((p) => ({ ...p, limit: Math.max(0, parseInt(e.target.value, 10) || 0) }))
              }
              className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-200"
            />
          </label>
        </div>
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
        <div className="mb-3 flex flex-wrap items-end gap-4 rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Batch size</span>
            <input
              type="number"
              min={1}
              max={500}
              value={enrichmentParams.batchSize}
              onChange={(e) =>
                setEnrichmentParams((p) => ({
                  ...p,
                  batchSize: Math.max(1, parseInt(e.target.value, 10) || 100),
                }))
              }
              className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Limit (0 = no limit)</span>
            <input
              type="number"
              min={0}
              value={enrichmentParams.limit}
              onChange={(e) =>
                setEnrichmentParams((p) => ({
                  ...p,
                  limit: Math.max(0, parseInt(e.target.value, 10) || 0),
                }))
              }
              className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-200"
            />
          </label>
        </div>
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

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Top-2 classifier (AI)</h2>
        <p className="mb-3 text-sm text-zinc-400">
          Populate <code className="rounded bg-zinc-700 px-1">top_2_industries</code> and{" "}
          <code className="rounded bg-zinc-700 px-1">top_2_processes</code> in template_analytics from use_case_description using OpenAI.
        </p>
        {top2Message && (
          <div
            className={`mb-3 rounded-lg border p-4 ${
              top2Message.type === "ok"
                ? "border-emerald-700 bg-emerald-900/20 text-emerald-200"
                : "border-red-800 bg-red-900/20 text-red-200"
            }`}
          >
            {top2Message.text}
          </div>
        )}
        <div className="mb-3 flex flex-wrap items-end gap-4 rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Batch size</span>
            <input
              type="number"
              min={1}
              max={500}
              value={top2Params.batchSize}
              onChange={(e) =>
                setTop2Params((p) => ({
                  ...p,
                  batchSize: Math.max(1, parseInt(e.target.value, 10) || 50),
                }))
              }
              className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Limit (0 = no limit)</span>
            <input
              type="number"
              min={0}
              value={top2Params.limit}
              onChange={(e) =>
                setTop2Params((p) => ({
                  ...p,
                  limit: Math.max(0, parseInt(e.target.value, 10) || 0),
                }))
              }
              className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-200"
            />
          </label>
          <label className="flex flex-col items-start gap-1.5 text-sm">
            <span className="text-zinc-400">Options</span>
            <label className="flex cursor-pointer items-center gap-2 text-zinc-300">
              <input
                type="checkbox"
                checked={top2Params.refresh}
                onChange={(e) =>
                  setTop2Params((p) => ({ ...p, refresh: e.target.checked }))
                }
                className="rounded border-zinc-600 bg-zinc-800"
              />
              <span>Refresh (recompute existing top_2_*)</span>
            </label>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRunTop2}
            disabled={loading}
            className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Starting…" : "Run top-2 (AI)"}
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
          Totals and last-run summaries from recorded enrichment, template-fetch, and top-2 classifier runs.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <h3 className="text-sm font-medium text-zinc-300">Top-2 classifier (script run sessions)</h3>
            {(() => {
              const ins = top2Insights(history.top2);
              return (
                <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                  <li>Total processed (all runs): <strong className="text-violet-400">{ins.totalProcessed.toLocaleString()}</strong></li>
                  <li>Total failed (all runs): <strong className="text-red-400">{ins.totalFailed.toLocaleString()}</strong></li>
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

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Full Top-2 classifier history</h2>
        <p className="mb-2 text-xs text-zinc-500">Chronological order (oldest first).</p>
        <HistoryTable rows={history.top2} emptyLabel="No runs yet." variant="top2" />
      </section>
    </div>
  );
}
