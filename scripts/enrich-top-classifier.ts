/**
 * Standalone top-2 classifier: updates only top_2_industries and top_2_processes
 * in template_analytics by analyzing existing use_case_description.
 *
 * Run: npm run enrich:top
 *   - Does not change any other fields.
 *   - Fetches rows that have use_case_description; optionally only those with
 *     empty top_2_* unless --refresh is passed.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * OPENAI_API_KEY required for AI classification (used by default; use --no-ai for rule-based only)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { classifyTop2 } from "./enrichment/top-classifier.js";
import { createAIRateLimiter } from "./enrichment/rate-limit.js";
import {
  isInteractive,
  promptYesNo,
  promptInt,
  question,
} from "./enrichment/prompts.js";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "scripts/scraper/.env") });

const BATCH_SIZE = parseInt(process.env.ENRICHMENT_BATCH_SIZE ?? "50", 10);
const USE_AI = process.env.ENRICHMENT_USE_AI !== "false";
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";
const AI_DELAY_MS = parseInt(process.env.ENRICHMENT_AI_DELAY_MS ?? "1200", 10);

type EnrichTopArgs = {
  batchSize: number;
  useAI: boolean;
  openaiKey: string;
  limit: number | null;
  refresh: boolean;
  aiDelayMs: number;
};

function hasCliArgs(): boolean {
  return process.argv.slice(2).length > 0;
}

async function runInteractive(): Promise<EnrichTopArgs> {
  console.log("\n--- Top-2 classifier (standalone) ---\n");
  const useAI = await promptYesNo("Use AI (OpenAI) for classification?", true);
  let openaiKey = process.env.OPENAI_API_KEY ?? "";
  if (useAI && !openaiKey) {
    const key = await question("OpenAI API key (or leave blank to skip AI)", "");
    openaiKey = key.trim();
  }
  const batchSize = await promptInt("Rows per batch", BATCH_SIZE);
  const limitRaw = await promptInt("Max rows to process this run (0 = no limit)", 0);
  const limit: number | null = limitRaw <= 0 ? null : limitRaw;
  const refresh = await promptYesNo("Recompute even when top_2_* already set (--refresh)?", false);
  let aiDelayMs = AI_DELAY_MS;
  if (useAI && openaiKey) {
    aiDelayMs = await promptInt("Delay between AI requests (ms)", AI_DELAY_MS);
  }
  console.log("");
  return {
    batchSize: Math.max(1, batchSize),
    useAI: useAI && !!openaiKey,
    openaiKey,
    limit,
    refresh,
    aiDelayMs: Math.max(0, aiDelayMs),
  };
}

function parseArgs(): EnrichTopArgs {
  const args = process.argv.slice(2);
  let batchSize = BATCH_SIZE;
  let useAI = USE_AI && !!OPENAI_KEY;
  let openaiKey = OPENAI_KEY;
  let limit: number | null = null;
  let refresh = false;
  let aiDelayMs = AI_DELAY_MS;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--batch-size" && args[i + 1])
      batchSize = parseInt(args[i + 1], 10) || batchSize;
    if (args[i] === "--use-ai") useAI = true;
    if (args[i] === "--no-ai") useAI = false;
    if (args[i] === "--openai-key" && args[i + 1]) openaiKey = args[i + 1];
    if (args[i] === "--limit" && args[i + 1])
      limit = parseInt(args[i + 1], 10) || null;
    if (args[i] === "--refresh") refresh = true;
    if (args[i] === "--ai-delay-ms" && args[i + 1])
      aiDelayMs = parseInt(args[i + 1], 10) || aiDelayMs;
  }
  return {
    batchSize: Math.max(1, batchSize),
    useAI: useAI && !!openaiKey,
    openaiKey,
    limit,
    refresh,
    aiDelayMs: Math.max(0, aiDelayMs),
  };
}

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or scripts/scraper/.env"
    );
  }
  return createClient(url, key);
}

type AnalyticsRow = {
  template_id: string;
  use_case_description: string | null;
  top_2_industries: unknown;
  top_2_processes: unknown;
};

function needsTop2(row: AnalyticsRow, refresh: boolean): boolean {
  if (refresh) return true;
  const industries = row.top_2_industries;
  const processes = row.top_2_processes;
  const hasIndustries = Array.isArray(industries) && industries.length > 0;
  const hasProcesses = Array.isArray(processes) && processes.length > 0;
  return !hasIndustries || !hasProcesses;
}

const FETCH_WINDOW = 150;

async function fetchAnalyticsBatch(
  supabase: SupabaseClient,
  options: {
    batchSize: number;
    offset: number;
    refresh: boolean;
  }
): Promise<{ data: AnalyticsRow[] }> {
  const { data, error } = await supabase
    .from("template_analytics")
    .select("template_id, use_case_description, top_2_industries, top_2_processes")
    .not("use_case_description", "is", null)
    .order("updated_at", { ascending: true })
    .range(options.offset, options.offset + FETCH_WINDOW - 1);

  if (error) throw new Error(`Fetch template_analytics: ${error.message}`);

  const rows = (data ?? []) as AnalyticsRow[];
  const withDescription = rows.filter(
    (r) => r.use_case_description && String(r.use_case_description).trim().length > 0
  );
  const needUpdate = options.refresh ? withDescription : withDescription.filter((r) => needsTop2(r, false));

  return {
    data: needUpdate.slice(0, options.batchSize),
  };
}

async function updateTop2(
  supabase: SupabaseClient,
  templateId: string,
  top_2_industries: unknown[],
  top_2_processes: unknown[]
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("template_analytics")
    .update({
      top_2_industries,
      top_2_processes,
      updated_at: new Date().toISOString(),
    })
    .eq("template_id", templateId);
  if (error) return { error: error.message };
  return {};
}

async function updateAdminRun(
  supabase: SupabaseClient,
  runId: string,
  status: "completed" | "failed",
  processed: number,
  failed: number
): Promise<void> {
  const { error } = await supabase
    .from("admin_job_runs")
    .update({
      completed_at: new Date().toISOString(),
      status,
      result: { processed_count: processed, failed_count: failed },
    })
    .eq("id", runId);
  if (error) console.error("Failed to update admin run:", error.message);
}

async function main(): Promise<void> {
  const args: EnrichTopArgs =
    isInteractive() && !hasCliArgs() ? await runInteractive() : parseArgs();

  console.log("Options:", {
    batchSize: args.batchSize,
    useAI: args.useAI,
    limit: args.limit,
    refresh: args.refresh,
    ...(args.useAI && { aiDelayMs: args.aiDelayMs }),
  });

  const adminRunId = process.env.ADMIN_RUN_ID;
  const supabase = getSupabase();
  let waitForAIRateLimit: (() => Promise<void>) | undefined;
  if (args.useAI) {
    const { waitForAIRateLimit: wait } = createAIRateLimiter({
      delayBetweenRequestsMs: args.aiDelayMs,
      batchSize: 0,
      batchPauseMs: 0,
    });
    waitForAIRateLimit = wait;
  }

  let offset = 0;
  let processed = 0;
  let failed = 0;
  let shuttingDown = false;
  process.on("SIGINT", () => {
    if (!shuttingDown) {
      shuttingDown = true;
      console.log("\nPausing after current row... (run again to resume)");
    }
  });
  process.on("SIGTERM", () => {
    if (!shuttingDown) shuttingDown = true;
  });

  try {
    for (;;) {
      if (shuttingDown) break;
      const { data: rows } = await fetchAnalyticsBatch(supabase, {
        batchSize: args.batchSize,
        offset,
        refresh: args.refresh,
      });

      if (rows.length === 0) {
        console.log("No more rows to process.");
        break;
      }

      console.log(`Processing batch count=${rows.length} (offset=${offset})`);

      for (const row of rows) {
        if (shuttingDown) break;
        if (args.limit !== null && processed + failed >= args.limit) break;

        const description = (row.use_case_description ?? "").trim();
        if (!description) continue;

        if (args.useAI && waitForAIRateLimit) await waitForAIRateLimit();
        const result = await classifyTop2(description, {
          useAI: args.useAI,
          openaiApiKey: args.openaiKey || undefined,
        });

        const { error: updateError } = await updateTop2(
          supabase,
          row.template_id,
          result.top_2_industries,
          result.top_2_processes
        );
        if (updateError) {
          console.error(`[FAIL] ${row.template_id}: ${updateError}`);
          failed++;
          continue;
        }
        processed++;
        if (processed % 10 === 0) {
          console.log(`  Progress: ${processed} updated, ${failed} failed`);
        }
      }

      if (shuttingDown) break;
      if (args.limit !== null && processed + failed >= args.limit) break;
      offset += FETCH_WINDOW;
    }

    if (adminRunId) {
      await updateAdminRun(supabase, adminRunId, "completed", processed, failed);
    }
    if (shuttingDown) {
      console.log(`Paused. Updated: ${processed}, Failed: ${failed}. Run again to resume.`);
    } else {
      console.log(`Done. Updated: ${processed}, Failed: ${failed}`);
    }
  } catch (err) {
    if (adminRunId) {
      await updateAdminRun(supabase, adminRunId, "failed", processed, failed);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
