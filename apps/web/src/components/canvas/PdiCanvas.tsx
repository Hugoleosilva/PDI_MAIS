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
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { PdiDoc, PdiLink } from "@pdi-mais/core";
import { layoutGraph, linkEdge, type Direction, type PdiNode } from "@/lib/pdi-to-graph";
import { brand } from "@/lib/theme";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
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
      style={{ background: active ? brand.ink : "white", color: active ? "white" : brand.muted }}
    >
      {children}
    </button>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex overflow-hidden rounded-md border shadow-sm" style={{ borderColor: brand.border }}>
      {children}
    </div>
  );
}

function Canvas({ pdi }: { pdi: PdiDoc }) {
  const [direction, setDirection] = useState<Direction>("LR");
  const [mode, setMode] = useState<Mode>("pan");
  const [selected, setSelected] = useState<PdiNode | null>(null);
  const [links, setLinks] = useState<PdiLink[]>(pdi.links ?? []);

  // Só nós + arestas estruturais (não depende dos links → criar link não re-organiza).
  const layout = useMemo(() => layoutGraph(pdi, { direction }), [pdi, direction]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const { fitView } = useReactFlow();

  const undoStack = useRef<PosMap[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // ---- links (conexões manuais estilo n8n) ----
  const removeLinkById = useCallback((id: string) => {
    setLinks((ls) => ls.filter((l) => l.id !== id));
    fetch(`/api/pdi/link?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    const id =
      globalThis.crypto?.randomUUID?.() ?? `l${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const link: PdiLink = { id, source: c.source, target: c.target };
    setLinks((ls) => [
      ...ls.filter((l) => !(l.source === link.source && l.target === link.target)),
      link,
    ]);
    fetch("/api/pdi/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(link),
    })
      .then((r) => {
        if (!r.ok) setLinks((ls) => ls.filter((l) => l.id !== id));
      })
      .catch(() => setLinks((ls) => ls.filter((l) => l.id !== id)));
  }, []);

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const e of deleted) {
        if ((e.data as { userLink?: boolean } | undefined)?.userLink) removeLinkById(e.id);
      }
    },
    [removeLinkById],
  );

  const linkEdgesMemo = useMemo(
    () =>
      links.map((l) => {
        const e = linkEdge(l);
        return { ...e, data: { ...e.data, onRemove: removeLinkById } };
      }),
    [links, removeLinkById],
  );

  // Nós: re-layout só quando muda direção/PDI.
  const patchRoot = useCallback(
    async (patch: { title?: string; track?: string }) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === "root" ? ({ ...n, data: { ...n.data, ...patch } } as PdiNode) : n,
        ),
      );
      try {
        await fetch("/api/pdi/root", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
      } catch {
        /* recarregar mostra o estado real */
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

  useEffect(() => {
    setNodes(withHandlers(layout.nodes));
    undoStack.current = [];
    setCanUndo(false);
    const id = requestAnimationFrame(() => fitView({ padding: 0.12, duration: 250 }));
    return () => cancelAnimationFrame(id);
  }, [layout.nodes, withHandlers, setNodes, fitView]);

  // Arestas = estruturais + links manuais.
  useEffect(() => {
    setEdges([...layout.edges, ...linkEdgesMemo]);
  }, [layout.edges, linkEdgesMemo, setEdges]);

  const reorganize = useCallback(() => {
    undoStack.current = [];
    setCanUndo(false);
    const g = layoutGraph(pdi, { direction });
    setNodes(withHandlers(g.nodes));
    requestAnimationFrame(() => fitView({ padding: 0.12, duration: 250 }));
  }, [pdi, direction, withHandlers, setNodes, fitView]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!prev) return;
    setNodes((ns) => ns.map((n) => (prev[n.id] ? { ...n, position: prev[n.id] } : n)));
  }, [setNodes]);

  const snapshot = useCallback((dragged: Node[]) => {
    undoStack.current.push(posMap(dragged));
    if (undoStack.current.length > 60) undoStack.current.shift();
    setCanUndo(true);
  }, []);
  const onNodeDragStart = useCallback(
    (_: unknown, __: unknown, d: Node[]) => snapshot(d),
    [snapshot],
  );
  const onSelectionDragStart = useCallback(
    (_: unknown, d: Node[]) => snapshot(d),
    [snapshot],
  );

  const clearSelection = useCallback(() => {
    setNodes((ns) =>
      ns.some((n) => n.selected) ? ns.map((n) => (n.selected ? { ...n, selected: false } : n)) : ns,
    );
  }, [setNodes]);
  const afterBlockMove = useCallback(() => {
    clearSelection();
    setMode("pan");
  }, [clearSelection]);

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
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onSelectionDragStart={onSelectionDragStart}
        onSelectionDragStop={afterBlockMove}
        onPaneClick={() => {
          setSelected(null);
          clearSelection();
        }}
        deleteKeyCode={["Delete"]}
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
              <ToolButton active={direction === "LR"} onClick={() => setDirection("LR")}>Horizontal</ToolButton>
              <ToolButton active={direction === "TB"} onClick={() => setDirection("TB")}>Vertical</ToolButton>
            </Group>
            <Group>
              <ToolButton active={mode === "pan"} onClick={() => setMode("pan")}>🖐 Navegar</ToolButton>
              <ToolButton active={mode === "select"} onClick={() => setMode("select")}>⬚ Selecionar</ToolButton>
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
              ? "Arraste para selecionar vários · mova o bloco junto · botão direito navega"
              : "Arraste da bolinha de um card até outro para conectar · clique na conexão + Del ou × para remover"}
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
