/**
 * Node analyzer: extract node statistics from template.nodes JSONB.
 * Produces unique node types (comma-separated pattern), total unique count, and total node count.
 */

import type { TemplateRow, WorkflowNode, NodeStats } from "./types.js";

/** Map n8n node type to friendly display name (optional, for descriptions) */
const NODE_TYPE_DISPLAY_NAMES: Record<string, string> = {
  "n8n-nodes-base.openAi": "OpenAI",
  "n8n-nodes-base.googleSheets": "Google Sheets",
  "n8n-nodes-base.gmail": "Gmail",
  "n8n-nodes-base.httpRequest": "HTTP Request",
  "n8n-nodes-base.if": "IF",
  "n8n-nodes-base.set": "Set",
  "n8n-nodes-base.scheduleTrigger": "Schedule Trigger",
  "n8n-nodes-base.formTrigger": "Form Trigger",
  "n8n-nodes-base.stickyNote": "Sticky Note",
  "n8n-nodes-base.emailSend": "Email Send",
  "n8n-nodes-base.form": "Form",
  "n8n-nodes-base.noOp": "No Operation",
  "n8n-nodes-base.typeformTrigger": "Typeform Trigger",
  "n8n-nodes-base.merge": "Merge",
  "n8n-nodes-base.function": "Code",
  "n8n-nodes-base.googleCalendar": "Google Calendar",
  "n8n-nodes-base.mattermost": "Mattermost",
  // Add more as needed; fallback is last segment of type
};

/**
 * Get display name for a node type (e.g. "n8n-nodes-base.openAi" -> "OpenAI").
 */
export function getNodeTypeDisplayName(nodeType: string): string {
  if (NODE_TYPE_DISPLAY_NAMES[nodeType]) {
    return NODE_TYPE_DISPLAY_NAMES[nodeType];
  }
  const segment = nodeType.split(".").pop();
  if (!segment) return nodeType;
  return segment.replace(/([A-Z])/g, " $1").trim() || nodeType;
}

/**
 * Analyze nodes array from a template and return node statistics.
 * Uses template.nodes when present; does not require node_types table.
 */
export function analyzeNodes(template: TemplateRow): NodeStats {
  const rawNodes = template.nodes;
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
    return {
      uniqueNodeTypes: [],
      totalUniqueNodeTypes: 0,
      totalNodeCount: 0,
      nodeBreakdown: [],
    };
  }

  const typeCounts = new Map<string, number>();
  for (const node of rawNodes as WorkflowNode[]) {
    const type = node?.type;
    if (typeof type === "string" && type.trim()) {
      const t = type.trim();
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
  }

  const uniqueNodeTypes = Array.from(typeCounts.keys()).sort();
  const nodeBreakdown = uniqueNodeTypes.map((nodeType) => ({
    nodeType,
    count: typeCounts.get(nodeType)!,
  }));

  const totalNodeCount = rawNodes.length;

  return {
    uniqueNodeTypes,
    totalUniqueNodeTypes: uniqueNodeTypes.length,
    totalNodeCount,
    nodeBreakdown,
  };
}

/**
 * Format unique node types as comma-separated string (for display or storage).
 */
export function formatUniqueNodeTypesAsString(stats: NodeStats): string {
  return stats.uniqueNodeTypes.join(", ");
}
