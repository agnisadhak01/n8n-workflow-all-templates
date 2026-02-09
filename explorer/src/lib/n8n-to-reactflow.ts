import type { Node, Edge } from "reactflow";

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  position?: [number, number] | { x: number; y: number };
  parameters?: Record<string, unknown>;
}

export interface N8nWorkflow {
  nodes?: N8nNode[];
  connections?: Record<string, Record<string, Array<Array<{ node: string; type?: string; index?: number }>>>>;
}

function positionToXY(pos: N8nNode["position"]): { x: number; y: number } {
  if (Array.isArray(pos) && pos.length >= 2) return { x: pos[0], y: pos[1] };
  if (pos && typeof pos === "object" && "x" in pos && "y" in pos) return { x: pos.x, y: pos.y };
  return { x: 0, y: 0 };
}

export function parseN8nWorkflowToReactFlow(workflow: N8nWorkflow): { nodes: Node[]; edges: Edge[] } {
  const n8nNodes = workflow.nodes ?? [];
  const connections = workflow.connections ?? {};
  const nameToId = new Map<string, string>();
  for (const n of n8nNodes) {
    if (n.id && n.name) nameToId.set(n.name, n.id);
  }

  const nodes: Node[] = n8nNodes.map((n) => {
    const { x, y } = positionToXY(n.position);
    return {
      id: n.id,
      type: "n8nNode",
      position: { x, y },
      data: {
        label: n.name,
        nodeType: n.type,
        parameters: n.parameters,
      },
    };
  });

  const edges: Edge[] = [];
  for (const [sourceName, conns] of Object.entries(connections)) {
    const sourceId = nameToId.get(sourceName);
    if (!sourceId) continue;
    for (const [_outputType, outputList] of Object.entries(conns)) {
      for (const outputGroup of outputList) {
        for (const targetRef of outputGroup) {
          const targetId = nameToId.get(targetRef.node);
          if (targetId) edges.push({ id: `${sourceId}-${targetId}-${targetRef.index ?? 0}`, source: sourceId, target: targetId });
        }
      }
    }
  }

  return { nodes, edges };
}
