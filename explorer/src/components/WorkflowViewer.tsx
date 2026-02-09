"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { parseN8nWorkflowToReactFlow } from "@/lib/n8n-to-reactflow";
import { N8nNode } from "./N8nNode";

const nodeTypes: NodeTypes = { n8nNode: N8nNode };

export function WorkflowViewer({ workflow }: { workflow: Record<string, unknown> }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => parseN8nWorkflowToReactFlow(workflow as Parameters<typeof parseN8nWorkflowToReactFlow>[0]),
    [workflow]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onInit = useCallback((instance: { fitView: (opts?: { padding?: number; maxZoom?: number }) => void }) => {
    instance.fitView({ padding: 0.2, maxZoom: 1 });
  }, []);

  if (!initialNodes.length) {
    return (
      <div className="flex h-[400px] items-center justify-center text-zinc-500">
        No nodes in this workflow.
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        className="bg-zinc-900"
        defaultEdgeOptions={{ style: { stroke: "#52525b" } }}
      >
        <Background color="#3f3f46" gap={16} />
        <Controls className="!border-zinc-700 !bg-zinc-800 [&>button]:!bg-zinc-800 [&>button]:!text-zinc-200 [&>button]:!border-zinc-600" />
        <MiniMap
          nodeColor="#22c55e"
          maskColor="rgb(24 24 27 / 0.8)"
          className="!bg-zinc-800 !border-zinc-700"
        />
      </ReactFlow>
    </div>
  );
}
