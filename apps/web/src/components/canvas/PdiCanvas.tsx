"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
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

type Mode = "pan" | "select";

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

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex overflow-hidden rounded-md border shadow-sm"
      style={{ borderColor: brand.border }}
    >
      {children}
    </div>
  );
}

function Canvas({ pdi }: { pdi: PdiDoc }) {
  const [direction, setDirection] = useState<Direction>("LR");
  const [mode, setMode] = useState<Mode>("pan");
  const [selected, setSelected] = useState<PdiNode | null>(null);

  const graph = useMemo(() => layoutGraph(pdi, { direction }), [pdi, direction]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const { fitView } = useReactFlow();

  const undoStack = useRef<PosMap[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const patchRoot = useCallback(
    async (patch: { title?: string; track?: string }) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === "root"
            ? ({ ...n, data: { ...n.data, ...patch } } as PdiNode)
            : n,
        ),
      );
      try {
        await fetch("/api/pdi/root", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
      } catch {
        /* silencioso — recarregar mostra o estado real */
      }
    },
    [setNodes],
  );

  const withHandlers = useCallback(
    (list: PdiNode[]): PdiNode[] =>
      list.map((n) =>
        n.type === "root"
          ? ({
              ...n,
              data: {
                ...n.data,
                onEditTitle: (v: string) => patchRoot({ title: v }),
                onEditTrack: (v: string) => patchRoot({ track: v }),
              },
            } as PdiNode)
          : n,
      ),
    [patchRoot],
  );

  const applyLayout = useCallback(
    (g: { nodes: PdiNode[]; edges: Edge[] }) => {
      setNodes(withHandlers(g.nodes));
      setEdges(g.edges);
      requestAnimationFrame(() => fitView({ padding: 0.12, duration: 250 }));
    },
    [setNodes, setEdges, fitView, withHandlers],
  );

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
    undoStack.current.push(posMap(dragged));
    if (undoStack.current.length > 60) undoStack.current.shift();
    setCanUndo(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
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
        zoomOnDoubleClick={false}
        selectionOnDrag={mode === "select"}
        panOnDrag={mode === "select" ? [1, 2] : true}
        selectionMode={SelectionMode.Partial}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.1}
        style={{ background: brand.pageBg }}
      >
        <Background gap={20} color="#D4D4D8" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />

        <Panel position="top-left">
          <div className="flex flex-wrap items-center gap-2">
            <Group>
              <ToolButton active={direction === "LR"} onClick={() => setDirection("LR")}>
                Horizontal
              </ToolButton>
              <ToolButton active={direction === "TB"} onClick={() => setDirection("TB")}>
                Vertical
              </ToolButton>
            </Group>
            <Group>
              <ToolButton active={mode === "pan"} onClick={() => setMode("pan")}>
                🖐 Navegar
              </ToolButton>
              <ToolButton active={mode === "select"} onClick={() => setMode("select")}>
                ⬚ Selecionar
              </ToolButton>
            </Group>
            <Group>
              <ToolButton onClick={undo}>
                <span style={{ opacity: canUndo ? 1 : 0.4 }}>↩ Desfazer</span>
              </ToolButton>
              <ToolButton onClick={reorganize}>⟳ Reorganizar</ToolButton>
            </Group>
          </div>
        </Panel>

        <Panel position="bottom-center">
          <div
            className="rounded-full border bg-white/90 px-3 py-1 text-[11px] shadow-sm backdrop-blur"
            style={{ borderColor: brand.border, color: brand.muted }}
          >
            {mode === "select"
              ? "Arraste para selecionar vários · mova o bloco junto · botão direito para navegar"
              : "Clique num card p/ detalhes · duplo clique no PDI p/ editar · arraste p/ mover · Ctrl+Z desfaz"}
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
