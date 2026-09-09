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
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GROUP_COLORS,
  groupOfArea,
  type PdiDoc,
  type PdiGroup,
  type PdiLink,
} from "@pdi-mais/core";
import {
  computeFrames,
  LAYOUT_LABEL,
  layoutGraph,
  linkEdge,
  NODE_SIZE,
  type Layout,
  type PdiNode,
} from "@/lib/pdi-to-graph";
import { getHelperLines } from "@/lib/helper-lines";
import { brand } from "@/lib/theme";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import { HelperLines } from "./HelperLines";
import { DetailPanel } from "./DetailPanel";

type PosMap = Record<string, { x: number; y: number }>;
const posMap = (ns: Node[]): PosMap =>
  Object.fromEntries(ns.map((n) => [n.id, { ...n.position }]));

type UndoEntry =
  | { kind: "positions"; data: PosMap }
  | { kind: "link-add"; link: PdiLink }
  | { kind: "link-remove"; link: PdiLink };

const LAYOUTS: Layout[] = ["tree-lr", "tree-tb", "kanban", "swimlane", "radial"];
const uuid = () =>
  globalThis.crypto?.randomUUID?.() ?? `x${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

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

function TBtn({
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
      className="whitespace-nowrap px-2.5 py-1 text-xs font-medium"
      style={{ background: active ? brand.ink : "white", color: active ? "white" : brand.muted }}
    >
      {children}
    </button>
  );
}

function Canvas({ pdi }: { pdi: PdiDoc }) {
  const [layoutKind, setLayoutKind] = useState<Layout>("tree-lr");
  const [selected, setSelected] = useState<PdiNode | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [links, setLinks] = useState<PdiLink[]>(pdi.links ?? []);
  const [groups, setGroups] = useState<PdiGroup[]>(pdi.groups ?? []);
  const [showGroups, setShowGroups] = useState(true);

  const linksRef = useRef(links);
  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  const isTree = layoutKind === "tree-lr" || layoutKind === "tree-tb";
  const groupsActive = showGroups && isTree;

  const layout = useMemo(
    () => layoutGraph(pdi, { layout: layoutKind, links: [], groups: groupsActive ? groups : [] }),
    [pdi, layoutKind, groups, groupsActive],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  const { fitView } = useReactFlow();

  const [lineH, setLineH] = useState<number>();
  const [lineV, setLineV] = useState<number>();

  const undoStack = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const pushUndo = useCallback((entry: UndoEntry) => {
    undoStack.current.push(entry);
    if (undoStack.current.length > 80) undoStack.current.shift();
    setCanUndo(true);
  }, []);

  // ---- blocos ----
  const putGroups = (next: PdiGroup[]) =>
    fetch("/api/pdi/groups", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groups: next }),
    }).catch(() => {});

  const commitGroups = useCallback((next: PdiGroup[]) => {
    setGroups(next);
    void putGroups(next);
  }, []);

  const renameGroup = useCallback(
    (id: string, title: string) =>
      commitGroups(groups.map((g) => (g.id === id ? { ...g, title } : g))),
    [groups, commitGroups],
  );
  const recolorGroup = useCallback(
    (id: string) =>
      commitGroups(
        groups.map((g) =>
          g.id === id
            ? {
                ...g,
                color:
                  GROUP_COLORS[(GROUP_COLORS.indexOf(g.color as (typeof GROUP_COLORS)[number]) + 1) % GROUP_COLORS.length],
              }
            : g,
        ),
      ),
    [groups, commitGroups],
  );
  const addGroup = useCallback(() => {
    commitGroups([
      ...groups,
      {
        id: uuid(),
        title: "Novo bloco",
        color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
        order: groups.length,
        areaIds: [],
      },
    ]);
    if (!showGroups) setShowGroups(true);
  }, [groups, commitGroups, showGroups]);
  const deleteGroup = useCallback(
    (id: string) => {
      commitGroups(groups.filter((g) => g.id !== id).map((g, i) => ({ ...g, order: i })));
      setSelectedGroupId(null);
    },
    [groups, commitGroups],
  );

  // ---- conexões manuais ----
  const addLink = useCallback(
    (link: PdiLink, undoable: boolean) => {
      setLinks((ls) => [
        ...ls.filter((l) => !(l.source === link.source && l.target === link.target)),
        link,
      ]);
      if (undoable) pushUndo({ kind: "link-add", link });
      void fetch("/api/pdi/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(link),
      }).catch(() => {});
    },
    [pushUndo],
  );

  const removeLink = useCallback(
    (id: string, undoable: boolean) => {
      const link = linksRef.current.find((l) => l.id === id);
      setLinks((ls) => ls.filter((l) => l.id !== id));
      if (link && undoable) pushUndo({ kind: "link-remove", link });
      void fetch(`/api/pdi/link?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    },
    [pushUndo],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      addLink({ id: uuid(), source: c.source, target: c.target }, true);
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
    const id = requestAnimationFrame(() => fitView({ padding: 0.14, duration: 250 }));
    return () => cancelAnimationFrame(id);
  }, [layout.nodes, withHandlers, setNodes, fitView]);

  useEffect(() => {
    setEdges([...layout.edges, ...linkEdgesMemo]);
  }, [layout.edges, linkEdgesMemo, setEdges]);

  // Frames dos blocos, derivados das posições atuais dos nós.
  const frames = useMemo<PdiNode[]>(() => {
    if (!groupsActive) return [];
    return computeFrames(nodes, groups).map((f) => ({
      ...f,
      selected: selectedGroupId === (f.data.groupId as string),
      data: {
        ...f.data,
        onRename: (v: string) => renameGroup(f.data.groupId as string, v),
        onRecolor: () => recolorGroup(f.data.groupId as string),
      },
    })) as PdiNode[];
  }, [groupsActive, nodes, groups, selectedGroupId, renameGroup, recolorGroup]);

  const rfNodes = useMemo(() => [...frames, ...nodes], [frames, nodes]);

  const reorganize = useCallback(() => {
    undoStack.current = [];
    setCanUndo(false);
    const g = layoutGraph(pdi, { layout: layoutKind, groups: groupsActive ? groups : [] });
    setNodes(withHandlers(g.nodes));
    requestAnimationFrame(() => fitView({ padding: 0.14, duration: 250 }));
  }, [pdi, layoutKind, groups, groupsActive, withHandlers, setNodes, fitView]);

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

  // Soltar uma ÁREA dentro de um frame → move a área pro bloco.
  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      setLineH(undefined);
      setLineV(undefined);
      if (!groupsActive || node.type !== "area") return;
      const cx = node.position.x + NODE_SIZE.area.width / 2;
      const cy = node.position.y + NODE_SIZE.area.height / 2;
      const hit = frames.find(
        (f) =>
          cx >= f.position.x &&
          cx <= f.position.x + (f.width ?? 0) &&
          cy >= f.position.y &&
          cy <= f.position.y + (f.height ?? 0),
      );
      const target = hit ? (hit.data.groupId as string) : null;
      const current = groupOfArea(groups).get(node.id) ?? null;
      if (target === current) return;
      const next = groups.map((g) => ({
        ...g,
        areaIds: g.areaIds.filter((id) => id !== node.id),
      }));
      if (target) next.find((g) => g.id === target)?.areaIds.push(node.id);
      commitGroups(next);
    },
    [groupsActive, frames, groups, commitGroups],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<PdiNode>[]) => {
      const real = changes.filter((c) => !("id" in c) || !String(c.id).startsWith("frame-"));
      setLineH(undefined);
      setLineV(undefined);
      const c = real[0];
      if (real.length === 1 && c.type === "position" && c.dragging && c.position) {
        const guides = getHelperLines(c, nodesRef.current);
        if (guides.snapPosition.x != null) c.position.x = guides.snapPosition.x;
        if (guides.snapPosition.y != null) c.position.y = guides.snapPosition.y;
        setLineH(guides.horizontal);
        setLineV(guides.vertical);
      }
      onNodesChange(real);
    },
    [onNodesChange],
  );

  const clearSelection = useCallback(() => {
    setNodes((ns) => (ns.some((n) => n.selected) ? ns.map((n) => ({ ...n, selected: false })) : ns));
    setEdges((es) => (es.some((e) => e.selected) ? es.map((e) => ({ ...e, selected: false })) : es));
    setSelectedGroupId(null);
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
    if (node.type === "group") {
      setSelectedGroupId((node.data as { groupId: string }).groupId);
      setSelected(null);
      return;
    }
    setSelectedGroupId(null);
    if (node.type === "root" || node.type === "band") {
      setSelected(null);
      return;
    }
    setSelected(node as PdiNode);
  }, []);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
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
        fitViewOptions={{ padding: 0.14 }}
        minZoom={0.08}
        style={{ background: brand.pageBg }}
      >
        <Background gap={20} color="#D4D4D8" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
        <HelperLines horizontal={lineH} vertical={lineV} />

        <Panel position="top-left">
          <div className="flex flex-wrap items-center gap-2">
            <Group>
              {LAYOUTS.map((l) => (
                <TBtn key={l} active={layoutKind === l} onClick={() => setLayoutKind(l)}>
                  {LAYOUT_LABEL[l]}
                </TBtn>
              ))}
            </Group>
            <Group>
              <TBtn
                active={showGroups}
                onClick={() => setShowGroups((v) => !v)}
              >
                ▦ Blocos
              </TBtn>
              <TBtn onClick={addGroup}>+ Bloco</TBtn>
            </Group>
            <Group>
              <TBtn onClick={undo}>
                <span style={{ opacity: canUndo ? 1 : 0.4 }}>↩ Desfazer</span>
              </TBtn>
              <TBtn onClick={reorganize}>⟳ Reorganizar</TBtn>
            </Group>
          </div>
        </Panel>

        {selectedGroup && (
          <Panel position="top-right">
            <div
              className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs shadow-sm"
              style={{ borderColor: brand.border }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: selectedGroup.color }} />
              <span className="max-w-[180px] truncate font-medium" style={{ color: brand.ink }}>
                {selectedGroup.title}
              </span>
              <button
                type="button"
                onClick={() => deleteGroup(selectedGroup.id)}
                className="rounded px-1.5 py-0.5 font-medium hover:bg-neutral-100"
                style={{ color: "#DC2626" }}
              >
                ✕ Excluir bloco
              </button>
            </div>
          </Panel>
        )}

        <Panel position="bottom-center">
          <div
            className="rounded-full border bg-white/90 px-3 py-1 text-[11px] shadow-sm backdrop-blur"
            style={{ borderColor: brand.border, color: brand.muted }}
          >
            {groupsActive
              ? "Arraste uma área para dentro de um bloco para movê-la · duplo clique no título do bloco renomeia"
              : "Arraste da bolinha de um card até outro para conectar · Shift+arraste seleciona vários · Ctrl+Z desfaz"}
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
