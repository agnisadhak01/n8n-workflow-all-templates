/**
 * Template analytics enrichment: populate template_analytics from templates.
 * Run: npm run enrich:analytics
 *   - Interactive mode (when TTY and no flags): prompts for options.
 *   - Non-interactive: npm run enrich:analytics -- [--batch-size 100 --use-ai ...]
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (e.g. from scripts/scraper/.env or root .env)
 * Optional: OPENAI_API_KEY for AI classification/description
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { analyzeNodes } from "./enrichment/node-analyzer.js";
import { classify } from "./enrichment/classifier.js";
import { generateUseCaseDescription } from "./enrichment/description-generator.js";
import { calculatePricing } from "./enrichment/pricing-calculator.js";
import { createAIRateLimiter } from "./enrichment/rate-limit.js";
import {
  isInteractive,
  promptYesNo,
  promptInt,
  question,
} from "./enrichment/prompts.js";
import type { TemplateRow, TemplateAnalyticsRow } from "./enrichment/types.js";

// Load .env from repo root and scripts/scraper
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "scripts/scraper/.env") });

const BATCH_SIZE = parseInt(process.env.ENRICHMENT_BATCH_SIZE ?? "50", 10);
const USE_AI = process.env.ENRICHMENT_USE_AI === "true";
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";
const AI_DELAY_MS = parseInt(process.env.ENRICHMENT_AI_DELAY_MS ?? "1200", 10);
const AI_BATCH_SIZE = parseInt(process.env.ENRICHMENT_AI_BATCH_SIZE ?? "0", 10);
const AI_BATCH_PAUSE_MS = parseInt(process.env.ENRICHMENT_AI_BATCH_PAUSE_MS ?? "60000", 10);

export type EnrichmentArgs = {
  batchSize: number;
  useAI: boolean;
  openaiKey: string;
  skipExisting: boolean;
  limit: number | null;
  aiDelayMs: number;
  aiBatchSize: number;
  aiBatchPauseMs: number;
};

function hasCliArgs(): boolean {
  return process.argv.slice(2).length > 0;
}

async function runInteractive(): Promise<EnrichmentArgs> {
  console.log("\n--- Template analytics enrichment ---\n");

  const useAI = await promptYesNo("Use AI (OpenAI) for classification and descriptions?", false);
  let openaiKey = process.env.OPENAI_API_KEY ?? "";
  if (useAI && !openaiKey) {
    const key = await question("OpenAI API key (or leave blank to skip AI)", "");
    openaiKey = key.trim();
  }

  const batchSize = await promptInt("Templates per batch", BATCH_SIZE);
  const limitRaw = await promptInt("Max templates to process this run (0 = no limit)", 0);
  const limit: number | null = limitRaw <= 0 ? null : limitRaw;

  const skipExisting = await promptYesNo("Skip already-enriched templates (resumable)?", true);

  let aiDelayMs = AI_DELAY_MS;
  let aiBatchSize = AI_BATCH_SIZE;
  let aiBatchPauseMs = AI_BATCH_PAUSE_MS;

  if (useAI && openaiKey) {
    aiDelayMs = await promptInt("Delay between AI requests (ms)", AI_DELAY_MS);
    aiBatchSize = await promptInt("AI batch size (0 = off, pause after N requests)", 0);
    if (aiBatchSize > 0) {
      aiBatchPauseMs = await promptInt("AI batch pause (ms)", AI_BATCH_PAUSE_MS);
    }
  }

  console.log("");
  return {
    batchSize: Math.max(1, batchSize),
    useAI: useAI && !!openaiKey,
    openaiKey,
    skipExisting,
    limit,
    aiDelayMs: Math.max(0, aiDelayMs),
    aiBatchSize: Math.max(0, aiBatchSize),
    aiBatchPauseMs: Math.max(0, aiBatchPauseMs),
  };
}

function parseArgs(): EnrichmentArgs {
  const args = process.argv.slice(2);
  let batchSize = BATCH_SIZE;
  let useAI = USE_AI;
  let openaiKey = OPENAI_KEY;
  let skipExisting = true;
  let limit: number | null = null;
  let aiDelayMs = AI_DELAY_MS;
  let aiBatchSize = AI_BATCH_SIZE;
  let aiBatchPauseMs = AI_BATCH_PAUSE_MS;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--batch-size" && args[i + 1])
      batchSize = parseInt(args[i + 1], 10) || batchSize;
    if (args[i] === "--use-ai") useAI = true;
    if (args[i] === "--no-ai") useAI = false;
    if (args[i] === "--openai-key" && args[i + 1]) openaiKey = args[i + 1];
    if (args[i] === "--skip-existing") skipExisting = true;
    if (args[i] === "--no-skip-existing") skipExisting = false;
    if (args[i] === "--limit" && args[i + 1])
      limit = parseInt(args[i + 1], 10) || null;
    if (args[i] === "--ai-delay-ms" && args[i + 1])
      aiDelayMs = parseInt(args[i + 1], 10) || aiDelayMs;
    if (args[i] === "--ai-batch-size" && args[i + 1])
      aiBatchSize = parseInt(args[i + 1], 10) || 0;
    if (args[i] === "--ai-batch-pause-ms" && args[i + 1])
      aiBatchPauseMs = parseInt(args[i + 1], 10) || aiBatchPauseMs;
  }

  return {
    batchSize,
    useAI,
    openaiKey,
    skipExisting,
    limit,
    aiDelayMs: Math.max(0, aiDelayMs),
    aiBatchSize: Math.max(0, aiBatchSize),
    aiBatchPauseMs: Math.max(0, aiBatchPauseMs),
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

const PENDING_VIEW = "templates_pending_analytics";
const SELECT_COLS = "id, source_id, title, description, category, tags, nodes";

async function fetchTemplates(
  supabase: SupabaseClient,
  options: {
    skipExisting: boolean;
    batchSize: number;
    limit: number | null;
    offset: number;
  }
): Promise<{ data: TemplateRow[]; total: number }> {
  const table = options.skipExisting ? PENDING_VIEW : "templates";
  const rangeEnd = options.batchSize - 1;
  const rangeStart = options.skipExisting ? 0 : options.offset;

  let query = supabase
    .from(table)
    .select(SELECT_COLS, { count: "exact" })
    .order("created_at", { ascending: true })
    .range(rangeStart, rangeStart + rangeEnd);

  if (options.limit !== null && !options.skipExisting) {
    query = query.limit(Math.min(options.batchSize, options.limit));
  }

  const { data: templates, error, count } = await query;

  if (error) throw new Error(`Fetch templates: ${error.message}`);

  return {
    data: (templates ?? []) as TemplateRow[],
    total: count ?? 0,
  };
}

async function enrichOne(
  template: TemplateRow,
  options: {
    useAI: boolean;
    openaiKey: string;
    waitForAIRateLimit?: () => Promise<void>;
  }
): Promise<{ row: TemplateAnalyticsRow | null; error?: string }> {
  try {
    const stats = analyzeNodes(template);

    if (options.useAI && options.waitForAIRateLimit) {
      await options.waitForAIRateLimit();
    }
    const classification = await classify(template, {
      useAI: options.useAI,
      openaiApiKey: options.openaiKey || undefined,
    });

    if (options.useAI && options.waitForAIRateLimit) {
      await options.waitForAIRateLimit();
    }
    const description = await generateUseCaseDescription(
      {
        title: template.title,
        description: template.description,
        tags: template.tags ?? [],
        nodeTypes: stats.uniqueNodeTypes,
        category: template.category,
      },
      { useAI: options.useAI, openaiApiKey: options.openaiKey || undefined }
    );
    const pricing = calculatePricing(stats);

    const row: TemplateAnalyticsRow = {
      template_id: template.id,
      use_case_name: template.title,
      use_case_description: description || null,
      applicable_industries: classification.industries,
      applicable_processes: classification.processes,
      unique_node_types: stats.uniqueNodeTypes,
      total_unique_node_types: stats.totalUniqueNodeTypes,
      total_node_count: stats.totalNodeCount,
      base_price_inr: pricing.basePriceINR,
      complexity_multiplier: pricing.complexityMultiplier,
      final_price_inr: pricing.finalPriceINR,
      enrichment_status: "enriched",
      enrichment_method: classification.method,
      confidence_score: Math.round(classification.confidenceScore * 100) / 100,
    };
    return { row };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { row: null, error: message };
  }
}

async function upsertAnalytics(
  supabase: SupabaseClient,
  row: TemplateAnalyticsRow
): Promise<{ error?: string }> {
  const { error } = await supabase.from("template_analytics").upsert(
    {
      template_id: row.template_id,
      use_case_name: row.use_case_name,
      use_case_description: row.use_case_description,
      applicable_industries: row.applicable_industries,
      applicable_processes: row.applicable_processes,
      unique_node_types: row.unique_node_types,
      total_unique_node_types: row.total_unique_node_types,
      total_node_count: row.total_node_count,
      base_price_inr: row.base_price_inr,
      complexity_multiplier: row.complexity_multiplier,
      final_price_inr: row.final_price_inr,
      enrichment_status: row.enrichment_status,
      enrichment_method: row.enrichment_method,
      confidence_score: row.confidence_score,
    },
    { onConflict: "template_id" }
  );
  if (error) return { error: error.message };
  return {};
}

async function main(): Promise<void> {
  const args: EnrichmentArgs =
    isInteractive() && !hasCliArgs()
      ? await runInteractive()
      : parseArgs();

  console.log("Options:", {
    batchSize: args.batchSize,
    useAI: args.useAI,
    skipExisting: args.skipExisting,
    limit: args.limit,
    ...(args.useAI && {
      aiDelayMs: args.aiDelayMs,
      aiBatchSize: args.aiBatchSize || "(off)",
      aiBatchPauseMs: args.aiBatchPauseMs,
    }),
  });

  const supabase = getSupabase();

  let waitForAIRateLimit: (() => Promise<void>) | undefined;
  if (args.useAI) {
    const { waitForAIRateLimit: wait } = createAIRateLimiter({
      delayBetweenRequestsMs: args.aiDelayMs,
      batchSize: args.aiBatchSize > 0 ? args.aiBatchSize : 0,
      batchPauseMs: args.aiBatchPauseMs,
      onBatchPause: (n) =>
        console.log(`  AI batch pause for ${args.aiBatchPauseMs / 1000}s after ${n} requests`),
    });
    waitForAIRateLimit = wait;
  }

  let offset = 0;
  let processed = 0;
  let failed = 0;
  let shuttingDown = false;

  function requestShutdown(): void {
    if (!shuttingDown) {
      shuttingDown = true;
      console.log("\nPausing after current template... (run the same command again to resume)");
    }
  }
  process.on("SIGINT", requestShutdown);
  process.on("SIGTERM", requestShutdown);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (shuttingDown) break;

    const { data: templates, total } = await fetchTemplates(supabase, {
      skipExisting: args.skipExisting,
      batchSize: args.batchSize,
      limit: args.limit,
      offset,
    });

    if (templates.length === 0) {
      console.log("No more templates to process.");
      break;
    }

    console.log(
      args.skipExisting
        ? `Processing batch count=${templates.length} (pending: ${total})`
        : `Processing batch offset=${offset} count=${templates.length} (total in DB: ${total})`
    );

    for (const template of templates) {
      if (shuttingDown) break;
      if (args.limit !== null && processed + failed >= args.limit) break;

      const { row, error: enrichError } = await enrichOne(template, {
        useAI: args.useAI,
        openaiKey: args.openaiKey,
        waitForAIRateLimit,
      });

      if (enrichError || !row) {
        console.error(`[FAIL] ${template.source_id} ${template.title?.slice(0, 40)}: ${enrichError ?? "no row"}`);
        failed++;
        continue;
      }

      const { error: upsertError } = await upsertAnalytics(supabase, row);
      if (upsertError) {
        console.error(`[UPSERT FAIL] ${template.source_id}: ${upsertError}`);
        failed++;
        continue;
      }

      processed++;
      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed} enriched, ${failed} failed`);
      }
    }

    if (shuttingDown) break;
    if (args.limit !== null && processed + failed >= args.limit) break;

    offset += args.skipExisting ? 0 : args.batchSize;
  }

  if (shuttingDown) {
    console.log(`Paused. Enriched: ${processed}, Failed: ${failed}. Run the same command to resume.`);
  } else {
    console.log(`Done. Enriched: ${processed}, Failed: ${failed}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
