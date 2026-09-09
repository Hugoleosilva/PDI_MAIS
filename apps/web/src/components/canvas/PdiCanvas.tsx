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

type UndoEntry =
  | { kind: "positions"; data: PosMap }
  | { kind: "link-add"; link: PdiLink }
  | { kind: "link-remove"; link: PdiLink };

function ToolButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium"
      style={{ background: "white", color: brand.muted }}
    >
      {children}
    </button>
  );
}

function DirButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
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
  const [selected, setSelected] = useState<PdiNode | null>(null);
  const [links, setLinks] = useState<PdiLink[]>(pdi.links ?? []);
  const linksRef = useRef(links);
  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  const layout = useMemo(
    () => layoutGraph(pdi, { direction, links: [] }),
    [pdi, direction],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const { fitView } = useReactFlow();

  const undoStack = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const pushUndo = useCallback((entry: UndoEntry) => {
    undoStack.current.push(entry);
    if (undoStack.current.length > 80) undoStack.current.shift();
    setCanUndo(true);
  }, []);

  // ---- conexões manuais ----
  const apiAddLink = (link: PdiLink) =>
    fetch("/api/pdi/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(link),
    }).catch(() => {});

  const apiRemoveLink = (id: string) =>
    fetch(`/api/pdi/link?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});

  const addLink = useCallback(
    (link: PdiLink, undoable: boolean) => {
      setLinks((ls) => [
        ...ls.filter((l) => !(l.source === link.source && l.target === link.target)),
        link,
      ]);
      if (undoable) pushUndo({ kind: "link-add", link });
      void apiAddLink(link);
    },
    [pushUndo],
  );

  const removeLink = useCallback(
    (id: string, undoable: boolean) => {
      const link = linksRef.current.find((l) => l.id === id);
      setLinks((ls) => ls.filter((l) => l.id !== id));
      if (link && undoable) pushUndo({ kind: "link-remove", link });
      void apiRemoveLink(id);
    },
    [pushUndo],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      const id =
        globalThis.crypto?.randomUUID?.() ??
        `l${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
      addLink({ id, source: c.source, target: c.target }, true);
    },
    [addLink],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const e of deleted) {
        if ((e.data as { userLink?: boolean } | undefined)?.userLink) removeLink(e.id, true);
      }
    },
    [removeLink],
  );

  const linkEdgesMemo = useMemo(
    () =>
      links.map((l) => {
        const e = linkEdge(l);
        return { ...e, data: { ...e.data, onRemove: (id: string) => removeLink(id, true) } };
      }),
    [links, removeLink],
  );

  // ---- nó raiz editável ----
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
    const entry = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!entry) return;
    if (entry.kind === "positions") {
      setNodes((ns) => ns.map((n) => (entry.data[n.id] ? { ...n, position: entry.data[n.id] } : n)));
    } else if (entry.kind === "link-add") {
      removeLink(entry.link.id, false);
    } else {
      addLink(entry.link, false);
    }
  }, [setNodes, addLink, removeLink]);

  const onNodeDragStart = useCallback(
    (_: unknown, __: unknown, dragged: Node[]) =>
      pushUndo({ kind: "positions", data: posMap(dragged) }),
    [pushUndo],
  );
  const onSelectionDragStart = useCallback(
    (_: unknown, dragged: Node[]) => pushUndo({ kind: "positions", data: posMap(dragged) }),
    [pushUndo],
  );

  const clearSelection = useCallback(() => {
    setNodes((ns) => (ns.some((n) => n.selected) ? ns.map((n) => ({ ...n, selected: false })) : ns));
    setEdges((es) => (es.some((e) => e.selected) ? es.map((e) => ({ ...e, selected: false })) : es));
  }, [setNodes, setEdges]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        setSelected(null);
        clearSelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, clearSelection]);

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
        onPaneClick={() => {
          setSelected(null);
          clearSelection();
        }}
        deleteKeyCode={["Delete"]}
        zoomOnDoubleClick={false}
        panOnDrag
        selectionOnDrag={false}
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
              <DirButton active={direction === "LR"} onClick={() => setDirection("LR")}>Horizontal</DirButton>
              <DirButton active={direction === "TB"} onClick={() => setDirection("TB")}>Vertical</DirButton>
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
            Arraste da bolinha de um card até outro para conectar · Shift+arraste seleciona vários · Ctrl+Z desfaz
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
