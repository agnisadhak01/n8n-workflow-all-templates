/**
 * Pricing calculator for template analytics.
 * Repetitive nodes = total_node_count - total_unique_node_types (common/similar nodes).
 * Base = (Repetitive × 700 INR) + (Unique Node Types × 2700 INR);
 * Final = Base × complexity_multiplier (0.8–1.2 based on diversity ratio).
 */

import type { NodeStats, PricingResult } from "./types.js";

const NODE_COUNT_RATE_INR = 700;
const UNIQUE_TYPE_RATE_INR = 2700;
const COMPLEXITY_MIN = 0.8;
const COMPLEXITY_MAX = 1.2;

/**
 * Calculate pricing for a template from its node statistics.
 */
export function calculatePricing(stats: NodeStats): PricingResult {
  const { totalNodeCount, totalUniqueNodeTypes } = stats;

  const repetitiveNodeCount = Math.max(
    0,
    totalNodeCount - totalUniqueNodeTypes
  );
  const repetitiveComponent = repetitiveNodeCount * NODE_COUNT_RATE_INR;
  const uniqueTypeComponent = totalUniqueNodeTypes * UNIQUE_TYPE_RATE_INR;
  const basePriceINR = repetitiveComponent + uniqueTypeComponent;

  const diversityRatio =
    totalNodeCount > 0 ? totalUniqueNodeTypes / totalNodeCount : 0;
  const complexityMultiplier = Math.min(
    COMPLEXITY_MAX,
    Math.max(COMPLEXITY_MIN, COMPLEXITY_MIN + diversityRatio * 0.4)
  );
  const roundedMultiplier =
    Math.round(complexityMultiplier * 100) / 100;
  const finalPriceINR = Math.round(basePriceINR * roundedMultiplier);

  return {
    basePriceINR,
    complexityMultiplier: roundedMultiplier,
    finalPriceINR,
    breakdown: {
      repetitiveNodeComponent: repetitiveComponent,
      uniqueTypeComponent,
    },
  };
}
