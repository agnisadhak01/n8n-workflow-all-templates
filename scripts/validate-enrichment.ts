/**
 * Validate enrichment status and data quality after running enrich:analytics.
 * Run: npx tsx scripts/validate-enrichment.ts
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (e.g. from scripts/scraper/.env)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "scripts/scraper/.env") });

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or scripts/scraper/.env"
    );
  }
  return createClient(url, key);
}

async function main() {
  const supabase = getSupabase();

  console.log("\n=== Enrichment status ===\n");

  const { count: totalTemplates } = await supabase
    .from("templates")
    .select("id", { count: "exact", head: true });
  const { count: totalAnalytics } = await supabase
    .from("template_analytics")
    .select("id", { count: "exact", head: true });
  const { count: enrichedCount } = await supabase
    .from("template_analytics")
    .select("id", { count: "exact", head: true })
    .eq("enrichment_status", "enriched");
  const { count: pendingCount } = await supabase
    .from("template_analytics")
    .select("id", { count: "exact", head: true })
    .eq("enrichment_status", "pending");
  const { count: failedCount } = await supabase
    .from("template_analytics")
    .select("id", { count: "exact", head: true })
    .eq("enrichment_status", "failed");

  const totalT = totalTemplates ?? 0;
  const totalA = totalAnalytics ?? 0;
  const enriched = enrichedCount ?? 0;
  const pending = pendingCount ?? 0;
  const failed = failedCount ?? 0;
  const withoutAnalytics = totalT - totalA;

  console.log("Templates (total):        ", totalT);
  console.log("template_analytics rows:   ", totalA);
  console.log("  - enriched:             ", enriched);
  console.log("  - pending:              ", pending);
  console.log("  - failed:               ", failed);
  console.log("Templates without analytics:", withoutAnalytics);
  console.log("");

  console.log("=== Data quality (enriched rows only) ===\n");

  const { data: quality } = await supabase
    .from("template_analytics")
    .select("id, base_price_inr, final_price_inr, complexity_multiplier, total_node_count, total_unique_node_types, use_case_description, confidence_score")
    .eq("enrichment_status", "enriched");

  const rows = quality ?? [];
  const nullBase = rows.filter((r) => r.base_price_inr == null || Number(r.base_price_inr) < 0).length;
  const nullFinal = rows.filter((r) => r.final_price_inr == null || Number(r.final_price_inr) < 0).length;
  const badMultiplier = rows.filter((r) => {
    const m = Number(r.complexity_multiplier);
    return m == null || m < 0.8 || m > 1.2;
  }).length;
  const nullNodeStats = rows.filter((r) => r.total_node_count == null || r.total_unique_node_types == null).length;
  const emptyDesc = rows.filter((r) => !r.use_case_description || String(r.use_case_description).trim() === "").length;
  const lowConfidence = rows.filter((r) => r.confidence_score != null && Number(r.confidence_score) < 0.5).length;

  console.log("Null or negative base_price_inr:  ", nullBase);
  console.log("Null or negative final_price_inr:", nullFinal);
  console.log("Invalid complexity_multiplier:    ", badMultiplier);
  console.log("Null node stats:                 ", nullNodeStats);
  console.log("Empty use_case_description:      ", emptyDesc);
  console.log("Low confidence (< 0.5):          ", lowConfidence);
  console.log("");

  console.log("=== Pricing formula check (sample of 5) ===\n");

  const { data: sample } = await supabase
    .from("template_analytics")
    .select("template_id, use_case_name, total_node_count, total_unique_node_types, base_price_inr, complexity_multiplier, final_price_inr, updated_at")
    .eq("enrichment_status", "enriched")
    .order("updated_at", { ascending: false })
    .limit(5);

  for (const row of sample ?? []) {
    const total = Number(row.total_node_count) || 0;
    const unique = Number(row.total_unique_node_types) || 0;
    const repetitive = Math.max(0, total - unique);
    const expectedBase = repetitive * 700 + unique * 2700;
    const actualBase = Number(row.base_price_inr);
    const match = actualBase === expectedBase ? "OK" : "MISMATCH";
    console.log(`${row.use_case_name?.slice(0, 50) ?? row.template_id}...`);
    console.log(`  nodes=${total} unique=${unique} repetitive=${repetitive} base=${actualBase} expected_base=${expectedBase} [${match}]`);
    console.log(`  updated_at: ${row.updated_at}`);
    console.log("");
  }

  console.log("=== Summary ===\n");
  const issues = [
    nullBase > 0 && `${nullBase} bad base_price_inr`,
    nullFinal > 0 && `${nullFinal} bad final_price_inr`,
    badMultiplier > 0 && `${badMultiplier} bad multiplier`,
    nullNodeStats > 0 && `${nullNodeStats} null node stats`,
    emptyDesc > 0 && `${emptyDesc} empty descriptions`,
    lowConfidence > 0 && `${lowConfidence} low confidence`,
  ].filter(Boolean);
  if (issues.length === 0) {
    console.log("No data quality issues found in enriched rows.");
  } else {
    console.log("Issues:", issues.join("; "));
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
