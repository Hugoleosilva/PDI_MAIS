"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { PdiDoc } from "@pdi-mais/core";
import { layoutGraph, type Direction, type PdiNode } from "@/lib/pdi-to-graph";
import { brand } from "@/lib/theme";
import { nodeTypes } from "./nodes";
import { DetailPanel } from "./DetailPanel";

type PosMap = Record<string, { x: number; y: number }>;
const posMap = (ns: Node[]): PosMap =>
  Object.fromEntries(ns.map((n) => [n.id, { ...n.position }]));

function ToolButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium"
      style={{
        background: active ? brand.ink : "white",
        color: active ? "white" : brand.muted,
      }}
    >
      {children}
    </button>
  );
}

function Canvas({ pdi }: { pdi: PdiDoc }) {
  const [direction, setDirection] = useState<Direction>("LR");
  const [selected, setSelected] = useState<PdiNode | null>(null);

  const graph = useMemo(() => layoutGraph(pdi, { direction }), [pdi, direction]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const { fitView } = useReactFlow();

  // Pilha de posições para desfazer (Ctrl+Z). Guarda o estado ANTES de cada arraste.
  const undoStack = useRef<PosMap[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const applyLayout = useCallback(
    (g: { nodes: PdiNode[]; edges: typeof edges }) => {
      setNodes(g.nodes);
      setEdges(g.edges);
      requestAnimationFrame(() => fitView({ padding: 0.12, duration: 250 }));
    },
    [setNodes, setEdges, fitView],
  );

  // Re-aplica o layout quando muda a direção (ou o PDI).
  useEffect(() => {
    undoStack.current = [];
    setCanUndo(false);
    applyLayout(graph);
  }, [graph, applyLayout]);

  const reorganize = useCallback(() => {
    undoStack.current = [];
    setCanUndo(false);
    applyLayout(layoutGraph(pdi, { direction }));
  }, [pdi, direction, applyLayout]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!prev) return;
    setNodes((ns) =>
      ns.map((n) => (prev[n.id] ? { ...n, position: prev[n.id] } : n)),
    );
  }, [setNodes]);

  const pushUndo = useCallback((_: unknown, __: unknown, dragged: Node[]) => {
    // no início do arraste, `dragged` traz as posições atuais de todos os nós
    undoStack.current.push(posMap(dragged));
    if (undoStack.current.length > 60) undoStack.current.shift();
    setCanUndo(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

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
        onNodeDragStart={pushUndo}
        onPaneClick={() => setSelected(null)}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.1}
        style={{ background: brand.pageBg }}
      >
        <Background gap={20} color="#D4D4D8" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />

        <Panel position="top-left">
          <div className="flex items-center gap-2">
            <div
              className="flex overflow-hidden rounded-md border shadow-sm"
              style={{ borderColor: brand.border }}
            >
              <ToolButton active={direction === "LR"} onClick={() => setDirection("LR")}>
                Horizontal
              </ToolButton>
              <ToolButton active={direction === "TB"} onClick={() => setDirection("TB")}>
                Vertical
              </ToolButton>
            </div>
            <div
              className="flex overflow-hidden rounded-md border shadow-sm"
              style={{ borderColor: brand.border }}
            >
              <ToolButton onClick={undo}>
                <span style={{ opacity: canUndo ? 1 : 0.4 }}>↩ Desfazer</span>
              </ToolButton>
              <ToolButton onClick={reorganize}>⟳ Reorganizar</ToolButton>
            </div>
          </div>
        </Panel>

        <Panel position="bottom-center">
          <div
            className="rounded-full border bg-white/90 px-3 py-1 text-[11px] shadow-sm backdrop-blur"
            style={{ borderColor: brand.border, color: brand.muted }}
          >
            Clique num card para ver detalhes · arraste para reorganizar · Ctrl+Z desfaz · scroll para zoom
          </div>
        </Panel>
      </ReactFlow>

      {selected && <DetailPanel node={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function PdiCanvas({ pdi }: { pdi: PdiDoc }) {
  return (
    <ReactFlowProvider>
      <Canvas pdi={pdi} />
    </ReactFlowProvider>
  );
}
