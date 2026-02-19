"use client";

import { useState, useEffect } from "react";
import { getStatus, getHistory, runEnrichment, runScraper, runTop2Enrichment, markRunStopped } from "./actions";
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

function InsightsCard({
  title,
  items,
  accentColor = "text-zinc-300",
}: {
  title: string;
  items: { label: string; value: number; highlight?: boolean }[];
  accentColor?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
      <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">{title}</p>
      <ul className="space-y-1 text-sm">
        {items.map(({ label, value, highlight }) => (
          <li key={label} className="flex justify-between gap-4">
            <span className="text-zinc-400">{label}</span>
            <span className={highlight ? accentColor : "text-zinc-200"}>{value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getProgressCounts(run: JobRunRow, jobType: "scraper" | "enrichment" | "top2") {
  const r = run.result ?? {};
  if (jobType === "scraper") {
    const done = (r.templates_ok ?? 0) + (r.templates_error ?? 0);
    const total = r.total_count ?? 0;
    return { done, total, ok: r.templates_ok ?? 0, failed: r.templates_error ?? 0 };
  }
  if (jobType === "enrichment") {
    const done = (r.enriched_count ?? 0) + (r.failed_count ?? 0);
    const total = r.total_count ?? 0;
    return { done, total, ok: r.enriched_count ?? 0, failed: r.failed_count ?? 0 };
  }
  const done = (r.processed_count ?? 0) + (r.failed_count ?? 0);
  const total = r.total_count ?? 0;
  return { done, total, ok: r.processed_count ?? 0, failed: r.failed_count ?? 0 };
}

function RunProgressBar({
  run,
  jobType,
  fillColor,
  countLabel,
}: {
  run: JobRunRow;
  jobType: "scraper" | "enrichment" | "top2";
  fillColor: string;
  countLabel: string;
}) {
  const { done, total, ok, failed } = getProgressCounts(run, jobType);
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const hasTotal = total > 0;

  return (
    <div className="mb-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
        {hasTotal ? (
          <div
            className={`h-full rounded-full transition-all duration-500 ${fillColor}`}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div
            className={`h-full animate-pulse rounded-full ${fillColor}`}
            style={{ width: "40%" }}
          />
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        {countLabel}: {ok.toLocaleString()}
        {failed > 0 && ` · ${failed.toLocaleString()} failed`}
        {hasTotal && ` · ${done.toLocaleString()} / ${total.toLocaleString()}`}
      </p>
    </div>
  );
}

function formatRunId(id: string): string {
  if (!id) return "—";
  return id.length >= 8 ? id.slice(0, 8) : id;
}

function MarkStoppedButton({ runId, onStopped }: { runId: string; onStopped: () => void }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    const result = await markRunStopped(runId);
    setLoading(false);
    if (result.ok) onStopped();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded border border-amber-600/50 bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-900/50 disabled:opacity-50"
    >
      {loading ? "Marking…" : "Mark as stopped"}
    </button>
  );
}

function RunIdCell({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  if (!id) return <span className="text-zinc-500">—</span>;
  const short = formatRunId(id);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(id);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = id;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <span
      title={`${id} — click to copy`}
      className="cursor-pointer font-mono text-xs text-zinc-500 hover:text-zinc-400"
      onClick={copy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && void copy()}
    >
      {copied ? "Copied!" : short}
    </span>
  );
}

function jobTypeTag(job_type: string): { label: string; className: string } {
  switch (job_type) {
    case "enrichment":
      return { label: "Enrichment", className: "bg-emerald-500/20 text-emerald-400" };
    case "scraper":
      return { label: "Data fetching", className: "bg-sky-500/20 text-sky-400" };
    case "top2":
      return { label: "Top-2 classifier", className: "bg-violet-500/20 text-violet-400" };
    default:
      return { label: job_type, className: "bg-zinc-500/20 text-zinc-400" };
  }
}

function getProgressBarStyle(jobType: string): { fillColor: string; countLabel: string } {
  switch (jobType) {
    case "scraper":
      return { fillColor: "bg-sky-500", countLabel: "Templates" };
    case "enrichment":
      return { fillColor: "bg-emerald-500", countLabel: "Enriched" };
    case "top2":
      return { fillColor: "bg-violet-500", countLabel: "Processed" };
    default:
      return { fillColor: "bg-zinc-500", countLabel: "Done" };
  }
}

function HistoryTable({
  rows,
  emptyLabel,
  onStopped,
}: {
  rows: JobRunRow[];
  emptyLabel: string;
  onStopped?: () => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800/80">
            <th className="p-3 font-medium text-zinc-300">Run ID</th>
            <th className="p-3 font-medium text-zinc-300">Started</th>
            <th className="p-3 font-medium text-zinc-300">Completed</th>
            <th className="p-3 font-medium text-zinc-300">Duration</th>
            <th className="p-3 font-medium text-zinc-300">Type</th>
            <th className="p-3 font-medium text-zinc-300">Result</th>
            <th className="p-3 font-medium text-zinc-300">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const tag = jobTypeTag(row.job_type);
            return (
              <tr key={row.id} className="border-b border-zinc-700/50">
                <td className="p-3">
                  <RunIdCell id={row.id} />
                </td>
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
                <td className="p-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tag.className}`}
                  >
                    {tag.label}
                  </span>
                </td>
                <td className="p-3 text-zinc-300">{formatResult(row)}</td>
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
                  {row.status === "running" && onStopped && (
                    <span className="ml-2">
                      <MarkStoppedButton runId={row.id} onStopped={onStopped} />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
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
  const [history, setHistory] = useState<{ runs: JobRunRow[] }>({ runs: [] });
  const [pollError, setPollError] = useState<string | null>(null);

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

  const activeRuns = history.runs
    .filter((r) => r.status === "running")
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  useEffect(() => {
    if (activeRuns.length === 0) return;
    setPollError(null);
    const prevRunningCount = history.runs.filter((r) => r.status === "running").length;
    const poll = async () => {
      const result = await getHistory();
      if (!result.ok) {
        setPollError(result.error ?? "Could not refresh run status");
        return;
      }
      setPollError(null);
      const newRunningCount = result.data.runs.filter((r) => r.status === "running").length;
      if (newRunningCount < prevRunningCount) {
        const statusResult = await getStatus();
        if (statusResult.ok) setStatus(statusResult.data);
      }
      setHistory(result.data);
    };
    poll(); // immediate first poll
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [activeRuns.length]);

  async function handleRefresh() {
    setLoading(true);
    setRunMessage(null);
    setScraperMessage(null);
    setTop2Message(null);
    setPollError(null);
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
        text: "Enrichment started in background.",
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
        text: "Template fetch started in background.",
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
        text: "Top-2 classifier started in background.",
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

      {activeRuns.length > 0 && (
        <section className="rounded-lg border border-amber-700/50 bg-amber-900/10 p-4">
          <h2 className="mb-3 text-lg font-semibold text-amber-200">Active runs</h2>
          <p className="mb-3 text-sm text-zinc-400">
            Scripts currently running, ordered by start time (oldest first). Progress updates every 2 seconds.
          </p>
          {pollError && (
            <div className="mb-3 rounded-lg border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-300">
              {pollError} — Click Refresh to retry.
            </div>
          )}
          <ul className="space-y-4">
            {activeRuns.map((run) => {
              const style = getProgressBarStyle(run.job_type);
              const stale = isStale(run.started_at, run.status);
              return (
                <li
                  key={run.id}
                  className={`rounded-lg border p-3 ${
                    stale
                      ? "border-amber-700/50 bg-amber-900/5"
                      : "border-zinc-700 bg-zinc-800/50"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${jobTypeTag(run.job_type).className}`}>
                      {jobTypeTag(run.job_type).label}
                    </span>
                    <RunIdCell id={run.id} />
                    <span className="text-sm text-zinc-400">
                      Started {new Date(run.started_at).toLocaleString()}
                    </span>
                    {stale && (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400">
                        Possibly stopped — no update for 2+ hours
                      </span>
                    )}
                    <MarkStoppedButton runId={run.id} onStopped={loadHistory} />
                  </div>
                  <RunProgressBar
                    run={run}
                    jobType={run.job_type as "scraper" | "enrichment" | "top2"}
                    fillColor={style.fillColor}
                    countLabel={style.countLabel}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Template fetch (scraper)</h2>
        <p className="mb-3 text-sm text-zinc-400">
          Fetch templates from api.n8n.io and upsert into the <code className="rounded bg-zinc-700 px-1">templates</code> table.
          Resumable: skips existing templates, saves state between runs.
        </p>
        {status.insights && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InsightsCard
              title="Database stats"
              accentColor="text-sky-400"
              items={[
                { label: "Total templates", value: status.insights.scraper.totalTemplates, highlight: true },
                { label: "Without analytics", value: status.insights.scraper.templatesWithoutAnalytics },
              ]}
            />
          </div>
        )}
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
          Resumable: only processes pending templates, never overwrites existing rows.
        </p>
        {status.insights && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InsightsCard
              title="template_analytics"
              accentColor="text-emerald-400"
              items={[
                { label: "Total rows", value: status.insights.enrichment.totalAnalytics, highlight: true },
                { label: "Enriched", value: status.insights.enrichment.enriched, highlight: true },
                { label: "Pending", value: status.insights.enrichment.pending },
                { label: "Failed", value: status.insights.enrichment.failed },
              ]}
            />
          </div>
        )}
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
          Resumable: only fills empty top_2_* rows; enable Refresh to recompute existing.
        </p>
        {status.insights && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InsightsCard
              title="top_2 columns"
              accentColor="text-violet-400"
              items={[
                { label: "Total analytics rows", value: status.insights.top2.totalAnalytics },
                { label: "Filled (top_2_*)", value: status.insights.top2.filledTop2, highlight: true },
                { label: "Pending", value: status.insights.top2.pendingTop2, highlight: true },
                { label: "Eligible (has use_case)", value: status.insights.top2.hasUseCaseDescription },
              ]}
            />
          </div>
        )}
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
              const ins = enrichmentInsights(history.runs.filter((r) => r.job_type === "enrichment"));
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
              const ins = scraperInsights(history.runs.filter((r) => r.job_type === "scraper"));
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
              const ins = top2Insights(history.runs.filter((r) => r.job_type === "top2"));
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
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Job run history</h2>
        <p className="mb-2 text-xs text-zinc-500">Chronological order (oldest first). All job types.</p>
        <HistoryTable rows={history.runs} emptyLabel="No runs yet." onStopped={loadHistory} />
      </section>
    </div>
  );
}
