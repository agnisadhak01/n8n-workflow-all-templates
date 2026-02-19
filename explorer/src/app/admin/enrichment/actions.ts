"use server";

import { getEnrichmentStatus } from "@/lib/enrich-status";
import type { EnrichmentStatus } from "@/lib/enrich-status";
import { startEnrichmentInBackground } from "@/lib/enrich-run";
import { startScraperInBackground } from "@/lib/scraper-run";
import { startTop2InBackground } from "@/lib/top2-run";
import { startServiceableNameInBackground } from "@/lib/service-name-run";
import { getJobHistory, markJobRunStopped, markStaleJobRuns } from "@/lib/admin-jobs";
import type { JobRunRow } from "@/lib/admin-jobs";

export async function getStatus(): Promise<
  { ok: true; data: EnrichmentStatus } | { ok: false; error: string }
> {
  const result = await getEnrichmentStatus();
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, data: result };
}

export async function runEnrichment(options?: {
  batchSize?: number;
  limit?: number;
}): Promise<{ ok: boolean; runId?: string; error?: string }> {
  return startEnrichmentInBackground(options);
}

export async function runScraper(options?: {
  batchSize?: number;
  delay?: number;
  limit?: number;
}): Promise<{ ok: boolean; runId?: string; error?: string }> {
  return startScraperInBackground(options);
}

export async function runTop2Enrichment(options?: {
  batchSize?: number;
  limit?: number;
  refresh?: boolean;
}): Promise<{ ok: boolean; runId?: string; error?: string }> {
  return startTop2InBackground(options);
}

export async function runServiceableNameEnrichment(options?: {
  batchSize?: number;
  limit?: number;
  refresh?: boolean;
}): Promise<{ ok: boolean; runId?: string; error?: string }> {
  return startServiceableNameInBackground(options);
}

export async function getHistory(): Promise<
  | { ok: true; data: { runs: JobRunRow[] } }
  | { ok: false; error: string }
> {
  const result = await getJobHistory();
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, data: result };
}

export async function markRunStopped(runId: string): Promise<{ ok: boolean; error?: string }> {
  return markJobRunStopped(runId);
}

export async function cleanupStaleRuns(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  return markStaleJobRuns();
}
