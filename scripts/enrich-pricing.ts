/**
 * Standalone pricing update: recalculates base_price_inr, complexity_multiplier,
 * and final_price_inr for existing template_analytics rows using the current
 * formula (repetitive vs unique nodes). Does not change any other fields.
 *
 * Run: npm run enrich:pricing
 *   --batch-size N   rows per batch (default 100)
 *   --limit N        max rows to update this run (0 = no limit, default 0)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (e.g. from scripts/scraper/.env or root .env)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { calculatePricing } from "./enrichment/pricing-calculator.js";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "scripts/scraper/.env") });

const BATCH_SIZE = parseInt(process.env.ENRICHMENT_BATCH_SIZE ?? "100", 10);

type PricingUpdateArgs = {
  batchSize: number;
  limit: number | null;
};

function parseArgs(): PricingUpdateArgs {
  const args = process.argv.slice(2);
  let batchSize = BATCH_SIZE;
  let limit: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--batch-size" && args[i + 1])
      batchSize = parseInt(args[i + 1], 10) || batchSize;
    if (args[i] === "--limit" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      limit = n <= 0 ? null : n;
    }
  }
  return {
    batchSize: Math.max(1, batchSize),
    limit,
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

type AnalyticsPricingRow = {
  template_id: string;
  total_node_count: number;
  total_unique_node_types: number;
};

async function fetchEnrichedBatch(
  supabase: SupabaseClient,
  options: { batchSize: number; offset: number }
): Promise<AnalyticsPricingRow[]> {
  const { data, error } = await supabase
    .from("template_analytics")
    .select("template_id, total_node_count, total_unique_node_types")
    .eq("enrichment_status", "enriched")
    .order("template_id", { ascending: true })
    .range(options.offset, options.offset + options.batchSize - 1);

  if (error) throw new Error(`Fetch template_analytics: ${error.message}`);
  return (data ?? []) as AnalyticsPricingRow[];
}

async function updatePricing(
  supabase: SupabaseClient,
  templateId: string,
  basePriceINR: number,
  complexityMultiplier: number,
  finalPriceINR: number
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("template_analytics")
    .update({
      base_price_inr: basePriceINR,
      complexity_multiplier: complexityMultiplier,
      final_price_inr: finalPriceINR,
      updated_at: new Date().toISOString(),
    })
    .eq("template_id", templateId);
  if (error) return { error: error.message };
  return {};
}

async function main(): Promise<void> {
  const args = parseArgs();

  console.log("Pricing update (repetitive vs unique formula)");
  console.log("Options:", {
    batchSize: args.batchSize,
    limit: args.limit ?? "no limit",
  });

  const supabase = getSupabase();
  let offset = 0;
  let processed = 0;
  let failed = 0;
  const limit = args.limit ?? null;

  for (;;) {
    const rows = await fetchEnrichedBatch(supabase, {
      batchSize: args.batchSize,
      offset,
    });

    if (rows.length === 0) {
      console.log("No more rows to process.");
      break;
    }

    console.log(`Processing batch count=${rows.length} (offset=${offset})`);

    for (const row of rows) {
      if (limit !== null && processed + failed >= limit) break;

      const pricing = calculatePricing({
        totalNodeCount: row.total_node_count,
        totalUniqueNodeTypes: row.total_unique_node_types,
        uniqueNodeTypes: [],
        nodeBreakdown: [],
      });

      const { error: updateError } = await updatePricing(
        supabase,
        row.template_id,
        pricing.basePriceINR,
        pricing.complexityMultiplier,
        pricing.finalPriceINR
      );
      if (updateError) {
        console.error(`[FAIL] ${row.template_id}: ${updateError}`);
        failed++;
        continue;
      }
      processed++;
      if (processed % 50 === 0) {
        console.log(`  Progress: ${processed} updated, ${failed} failed`);
      }
    }

    if (limit !== null && processed + failed >= limit) {
      console.log("Limit reached.");
      break;
    }
    if (rows.length < args.batchSize) break;
    offset += args.batchSize;
  }

  console.log(`Done. Updated: ${processed}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
