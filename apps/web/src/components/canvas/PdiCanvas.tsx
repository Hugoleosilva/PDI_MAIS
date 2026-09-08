"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { PdiDoc } from "@pdi-mais/core";
import { layoutGraph, type PdiNode } from "@/lib/pdi-to-graph";
import { brand } from "@/lib/theme";
import { nodeTypes } from "./nodes";
import { DetailPanel } from "./DetailPanel";

export function PdiCanvas({ pdi }: { pdi: PdiDoc }) {
  const initial = useMemo(() => layoutGraph(pdi), [pdi]);
  const [nodes, , onNodesChange] = useNodesState<PdiNode>(initial.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initial.edges);
  const [selected, setSelected] = useState<PdiNode | null>(null);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelected(node.type === "root" ? null : (node as PdiNode));
  }, []);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelected(null)}
        nodesConnectable={false}
        fitView
        minZoom={0.15}
        style={{ background: brand.pageBg }}
      >
        <Background gap={20} color="#D4D4D8" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
      </ReactFlow>
      {selected && <DetailPanel node={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
