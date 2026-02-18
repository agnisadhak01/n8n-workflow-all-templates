"use server";

import { getEnrichmentStatus } from "@/lib/enrich-status";
import type { EnrichmentStatus } from "@/lib/enrich-status";
import { startEnrichmentInBackground } from "@/lib/enrich-run";
import { startScraperInBackground } from "@/lib/scraper-run";
import { getJobHistory } from "@/lib/admin-jobs";
import type { JobRunRow } from "@/lib/admin-jobs";

export async function getStatus(): Promise<
  { ok: true; data: EnrichmentStatus } | { ok: false; error: string }
> {
  const result = await getEnrichmentStatus();
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, data: result };
}

export async function runEnrichment(): Promise<{ ok: boolean; error?: string }> {
  return startEnrichmentInBackground();
}

export async function runScraper(): Promise<{ ok: boolean; error?: string }> {
  return startScraperInBackground();
}

export async function getHistory(): Promise<
  { ok: true; data: { enrichment: JobRunRow[]; scraper: JobRunRow[] } } | { ok: false; error: string }
> {
  const result = await getJobHistory();
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, data: result };
}
