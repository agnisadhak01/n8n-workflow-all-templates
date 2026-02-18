/**
 * Shared types for template analytics enrichment pipeline.
 */

/** Minimal node shape from templates.nodes JSONB */
export interface WorkflowNode {
  id?: string;
  name?: string;
  type: string;
  position?: [number, number];
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Template row as returned from Supabase (templates table) */
export interface TemplateRow {
  id: string;
  source_id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  nodes: WorkflowNode[];
  raw_workflow?: Record<string, unknown>;
  source_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Node statistics extracted from a template */
export interface NodeStats {
  uniqueNodeTypes: string[];
  totalUniqueNodeTypes: number;
  totalNodeCount: number;
  nodeBreakdown: Array<{ nodeType: string; count: number }>;
}

/** Industry or process item with confidence (for JSONB storage) */
export interface ClassifiedItem {
  name: string;
  confidence: number;
  reasoning?: string;
  keywords?: string[];
}

/** Result from industry/process classification */
export interface ClassificationResult {
  industries: ClassifiedItem[];
  processes: ClassifiedItem[];
  method: "ai" | "rule-based" | "hybrid";
  confidenceScore: number;
}

/** Pricing calculation result */
export interface PricingResult {
  basePriceINR: number;
  complexityMultiplier: number;
  finalPriceINR: number;
  breakdown: {
    repetitiveNodeComponent: number;
    uniqueTypeComponent: number;
  };
}

/** One template_analytics row (for insert/update) */
export interface TemplateAnalyticsRow {
  template_id: string;
  use_case_name: string;
  use_case_description: string | null;
  applicable_industries: ClassifiedItem[];
  applicable_processes: ClassifiedItem[];
  /** Set by standalone enrich-top-classifier script; not written by main enrichment */
  top_2_industries?: ClassifiedItem[];
  top_2_processes?: ClassifiedItem[];
  unique_node_types: string[];
  total_unique_node_types: number;
  total_node_count: number;
  base_price_inr: number;
  complexity_multiplier: number;
  final_price_inr: number;
  enrichment_status: "pending" | "enriched" | "failed";
  enrichment_method: "ai" | "rule-based" | "hybrid";
  confidence_score: number | null;
}

/** Input for description generation */
export interface DescriptionInput {
  title: string;
  description: string | null;
  tags: string[];
  nodeTypes: string[];
  category: string | null;
}

/** Options for the enrichment pipeline */
export interface EnrichmentOptions {
  batchSize?: number;
  useAI?: boolean;
  openaiApiKey?: string;
  confidenceThreshold?: number;
  skipExisting?: boolean;
}
