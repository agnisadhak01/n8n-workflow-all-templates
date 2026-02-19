/**
 * Standalone serviceable name enrichment: updates unique_common_serviceable_name
 * in template_analytics with a plain-English name (~15–25 chars); uses use case name as-is when clear, else AI or rule-based.
 *
 * Run: npm run enrich:serviceable-name
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * OPENAI_API_KEY required for AI (use --no-ai for rule-based only)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { generateServiceableName } from "./enrichment/serviceable-name-generator.js";
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

type EnrichServiceableNameArgs = {
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

async function runInteractive(): Promise<EnrichServiceableNameArgs> {
  console.log("\n--- Serviceable name enrichment ---\n");
  const useAI = await promptYesNo("Use AI (OpenAI) for serviceable names?", true);
  let openaiKey = process.env.OPENAI_API_KEY ?? "";
  if (useAI && !openaiKey) {
    const key = await question("OpenAI API key (or leave blank to skip AI)", "");
    openaiKey = key.trim();
  }
  const batchSize = await promptInt("Rows per batch", BATCH_SIZE);
  const limitRaw = await promptInt("Max rows to process this run (0 = no limit)", 0);
  const limit: number | null = limitRaw <= 0 ? null : limitRaw;
  const refresh = await promptYesNo(
    "Recompute even when unique_common_serviceable_name already set (--refresh)?",
    false
  );
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

function parseArgs(): EnrichServiceableNameArgs {
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
  use_case_name: string | null;
  use_case_description: string | null;
  unique_node_types: string[] | null;
  unique_common_serviceable_name: string | null;
};

type TemplateRow = { id: string; title: string | null };

function needsUpdate(row: AnalyticsRow, refresh: boolean): boolean {
  if (refresh) return true;
  const name = row.unique_common_serviceable_name;
  return !name || String(name).trim().length === 0;
}

const FETCH_WINDOW = 150;

async function fetchAnalyticsBatch(
  supabase: SupabaseClient,
  options: {
    batchSize: number;
    offset: number;
    refresh: boolean;
  }
): Promise<{ data: AnalyticsRow[]; templateTitles: Map<string, string>; exhausted: boolean }> {
  const { data, error } = await supabase
    .from("template_analytics")
    .select("template_id, use_case_name, use_case_description, unique_node_types, unique_common_serviceable_name")
    .order("updated_at", { ascending: true })
    .range(options.offset, options.offset + FETCH_WINDOW - 1);

  if (error) throw new Error(`Fetch template_analytics: ${error.message}`);

  const rows = (data ?? []) as AnalyticsRow[];
  const exhausted = rows.length < FETCH_WINDOW;
  const needUpdate = options.refresh ? rows : rows.filter((r) => needsUpdate(r, false));
  const batch = needUpdate.slice(0, options.batchSize);

  const templateIds = [...new Set(batch.map((r) => r.template_id))];
  const { data: templatesData } = await supabase
    .from("templates")
    .select("id, title")
    .in("id", templateIds);

  const templateTitles = new Map<string, string>();
  for (const t of (templatesData ?? []) as TemplateRow[]) {
    templateTitles.set(t.id, (t.title || "").trim());
  }

  return { data: batch, templateTitles, exhausted };
}

async function updateServiceableName(
  supabase: SupabaseClient,
  templateId: string,
  name: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("template_analytics")
    .update({
      unique_common_serviceable_name: name,
      updated_at: new Date().toISOString(),
    })
    .eq("template_id", templateId);
  if (error) return { error: error.message };
  return {};
}

async function reportAdminRunProgress(
  supabase: SupabaseClient,
  runId: string,
  processed: number,
  failed: number,
  totalCount: number
): Promise<void> {
  const { error } = await supabase
    .from("admin_job_runs")
    .update({
      result: {
        processed_count: processed,
        failed_count: failed,
        total_count: totalCount,
      },
    })
    .eq("id", runId);
  if (error) console.error("Failed to report progress:", error.message);
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

async function countRowsToProcess(
  supabase: SupabaseClient,
  refresh: boolean
): Promise<number> {
  if (refresh) {
    const { count, error } = await supabase
      .from("template_analytics")
      .select("template_id", { count: "exact", head: true });
    return error ? 0 : count ?? 0;
  }
  const { count: countNull, error: errNull } = await supabase
    .from("template_analytics")
    .select("template_id", { count: "exact", head: true })
    .is("unique_common_serviceable_name", null);
  if (errNull) return 0;
  const { count: countEmpty, error: errEmpty } = await supabase
    .from("template_analytics")
    .select("template_id", { count: "exact", head: true })
    .eq("unique_common_serviceable_name", "");
  if (errEmpty) return countNull ?? 0;
  return (countNull ?? 0) + (countEmpty ?? 0);
}

async function main(): Promise<void> {
  const args: EnrichServiceableNameArgs =
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
  const totalToProcess = await countRowsToProcess(supabase, args.refresh);
  const effectiveTotal =
    args.limit !== null ? Math.min(totalToProcess, args.limit) : totalToProcess;

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
    if (adminRunId && effectiveTotal > 0) {
      await reportAdminRunProgress(supabase, adminRunId, 0, 0, effectiveTotal);
    }
    for (;;) {
      if (shuttingDown) break;
      const { data: rows, templateTitles, exhausted } = await fetchAnalyticsBatch(
        supabase,
        {
          batchSize: args.batchSize,
          offset,
          refresh: args.refresh,
        }
      );

      if (rows.length === 0) {
        if (exhausted) {
          console.log("No more rows to process.");
          break;
        }
        offset += FETCH_WINDOW;
        continue;
      }

      console.log(`Processing batch count=${rows.length} (offset=${offset})`);

      for (const row of rows) {
        if (shuttingDown) break;
        if (args.limit !== null && processed + failed >= args.limit) break;

        const title = templateTitles.get(row.template_id) ?? "";
        const nodeTypes = Array.isArray(row.unique_node_types) ? row.unique_node_types : [];

        if (args.useAI && waitForAIRateLimit) await waitForAIRateLimit();
        const name = await generateServiceableName(
          {
            title: title || "Workflow",
            useCaseDescription: row.use_case_description,
            useCaseName: row.use_case_name,
            nodeTypes,
          },
          {
            useAI: args.useAI,
            openaiApiKey: args.openaiKey || undefined,
          }
        );

        const { error: updateError } = await updateServiceableName(
          supabase,
          row.template_id,
          name
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

      if (adminRunId) {
        await reportAdminRunProgress(
          supabase,
          adminRunId,
          processed,
          failed,
          effectiveTotal
        );
      }

      if (shuttingDown) break;
      if (args.limit !== null && processed + failed >= args.limit) break;
      offset += FETCH_WINDOW;
    }

    if (adminRunId) {
      await updateAdminRun(supabase, adminRunId, "completed", processed, failed);
    }
    if (shuttingDown) {
      console.log(
        `Paused. Updated: ${processed}, Failed: ${failed}. Run again to resume.`
      );
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
