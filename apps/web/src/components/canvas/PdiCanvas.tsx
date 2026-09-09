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
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GROUP_COLORS,
  groupOfArea,
  resolveSeedGroups,
  type PdiCanvasState,
  type PdiDoc,
  type PdiGroup,
  type PdiLink,
} from "@pdi-mais/core";
import {
  EMPTY_FRAME,
  LAYOUT_LABEL,
  layoutGraph,
  linkEdge,
  NODE_SIZE,
  type FrameBox,
  type Layout,
  type PdiNode,
} from "@/lib/pdi-to-graph";
import { getHelperLines } from "@/lib/helper-lines";
import { brand } from "@/lib/theme";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import { HelperLines } from "./HelperLines";
import { DetailPanel } from "./DetailPanel";

type Pos = { x: number; y: number };
type PosMap = Record<string, Pos>;

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
  const [showGroups, setShowGroups] = useState(true);
  const [selected, setSelected] = useState<PdiNode | null>(null);
  const [links, setLinks] = useState<PdiLink[]>(pdi.links ?? []);
  const [groups, setGroups] = useState<PdiGroup[]>(pdi.groups ?? []);
  const [positions, setPositions] = useState<PosMap>(pdi.canvas?.positions ?? {});
  const [frameBoxes, setFrameBoxes] = useState<Record<string, FrameBox>>(
    Object.fromEntries(
      Object.entries(pdi.canvas?.frames ?? {}).map(([k, v]) => [k, { ...v }]),
    ),
  );

  const linksRef = useRef(links);
  const positionsRef = useRef(positions);
  const frameBoxesRef = useRef(frameBoxes);
  useEffect(() => void (linksRef.current = links), [links]);
  useEffect(() => void (positionsRef.current = positions), [positions]);
  useEffect(() => void (frameBoxesRef.current = frameBoxes), [frameBoxes]);

  const isTree = layoutKind === "tree-lr" || layoutKind === "tree-tb";
  const groupsActive = showGroups && isTree;

  const layout = useMemo(
    () =>
      layoutGraph(pdi, {
        layout: layoutKind,
        links: [],
        groups: groupsActive ? groups : [],
        positions,
        frameBoxes,
      }),
    [pdi, layoutKind, groupsActive, groups, positions, frameBoxes],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const nodesRef = useRef(nodes);
  useEffect(() => void (nodesRef.current = nodes), [nodes]);
  const { fitView } = useReactFlow();

  const [lineH, setLineH] = useState<number>();
  const [lineV, setLineV] = useState<number>();

  // ---- persistência do canvas (debounce) ----
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const groupsRef = useRef(groups);
  useEffect(() => void (groupsRef.current = groups), [groups]);

  const saveCanvas = useCallback(() => {
    const body: PdiCanvasState = {
      positions: positionsRef.current,
      frames: frameBoxesRef.current,
    };
    setSaveState("saving");
    Promise.allSettled([
      fetch("/api/pdi/canvas", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      fetch("/api/pdi/groups", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groups: groupsRef.current }),
      }),
    ]).finally(() => {
      setSaveState("saved");
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 2500);
    });
  }, []);
  const scheduleSave = useCallback(() => {
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveCanvas, 700);
  }, [saveCanvas]);

  // ---- undo ----
  const undoStack = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const pushUndo = useCallback((entry: UndoEntry) => {
    undoStack.current.push(entry);
    if (undoStack.current.length > 80) undoStack.current.shift();
    setCanUndo(true);
  }, []);

  // ---- blocos ----
  const commitGroups = useCallback(
    (next: PdiGroup[]) => {
      setGroups(next);
      groupsRef.current = next;
      scheduleSave();
    },
    [scheduleSave],
  );

  const applySuggestedGroups = useCallback(() => {
    commitGroups(resolveSeedGroups(pdi));
    setPositions({});
    positionsRef.current = {};
    setFrameBoxes({});
    frameBoxesRef.current = {};
    if (!showGroups) setShowGroups(true);
    requestAnimationFrame(() => fitView({ padding: 0.14, duration: 300 }));
  }, [pdi, commitGroups, showGroups, fitView]);

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
                  GROUP_COLORS[
                    (GROUP_COLORS.indexOf(g.color as (typeof GROUP_COLORS)[number]) + 1) %
                      GROUP_COLORS.length
                  ],
              }
            : g,
        ),
      ),
    [groups, commitGroups],
  );
  const addGroup = useCallback(() => {
    const id = uuid();
    const ns = nodesRef.current.filter((n) => n.type !== "group");
    const minX = ns.length ? Math.min(...ns.map((n) => n.position.x)) : 0;
    const maxY = ns.length
      ? Math.max(
          ...ns.map(
            (n) =>
              n.position.y + (NODE_SIZE[n.type as keyof typeof NODE_SIZE]?.height ?? 110),
          ),
        )
      : 0;
    setFrameBoxes((fb) => ({
      ...fb,
      [id]: { x: minX, y: maxY + 100, w: EMPTY_FRAME.w, h: EMPTY_FRAME.h },
    }));
    commitGroups([
      ...groups,
      {
        id,
        title: "Novo bloco",
        color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
        order: groups.length,
        areaIds: [],
      },
    ]);
    if (!showGroups) setShowGroups(true);
    scheduleSave();
  }, [groups, commitGroups, showGroups, scheduleSave]);
  const deleteGroup = useCallback(
    (id: string) => {
      commitGroups(groups.filter((g) => g.id !== id).map((g, i) => ({ ...g, order: i })));
      setFrameBoxes((fb) => {
        const { [id]: _drop, ...rest } = fb;
        return rest;
      });
      scheduleSave();
    },
    [groups, commitGroups, scheduleSave],
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
      if (c.source.startsWith("frame-") || c.target.startsWith("frame-")) return;
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

  // ---- injeta handlers nos nós raiz / bloco ----
  const patchRoot = useCallback(async (patch: { title?: string; track?: string }) => {
    setNodes((ns) =>
      ns.map((n) => (n.id === "root" ? ({ ...n, data: { ...n.data, ...patch } } as PdiNode) : n)),
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
  }, [setNodes]);

  const withHandlers = useCallback(
    (list: PdiNode[]): PdiNode[] =>
      list.map((n) => {
        if (n.type === "root") {
          return {
            ...n,
            data: {
              ...n.data,
              onEditTitle: (v: string) => patchRoot({ title: v }),
              onEditTrack: (v: string) => patchRoot({ track: v }),
            },
          } as PdiNode;
        }
        if (n.type === "group") {
          const gid = n.data.groupId as string;
          return {
            ...n,
            data: {
              ...n.data,
              onRename: (v: string) => renameGroup(gid, v),
              onRecolor: () => recolorGroup(gid),
            },
          } as PdiNode;
        }
        return n;
      }),
    [patchRoot, renameGroup, recolorGroup],
  );

  // ---- sincroniza estrutura; fitView só quando muda o formato ----
  const prevLayoutKind = useRef<Layout | null>(null);
  useEffect(() => {
    setNodes(withHandlers(layout.nodes));
    if (prevLayoutKind.current !== layoutKind) {
      prevLayoutKind.current = layoutKind;
      undoStack.current = [];
      setCanUndo(false);
      const id = requestAnimationFrame(() => fitView({ padding: 0.14, duration: 250 }));
      return () => cancelAnimationFrame(id);
    }
  }, [layout.nodes, withHandlers, setNodes, fitView, layoutKind]);

  useEffect(() => {
    setEdges([...layout.edges, ...linkEdgesMemo]);
  }, [layout.edges, linkEdgesMemo, setEdges]);

  const reorganize = useCallback(() => {
    undoStack.current = [];
    setCanUndo(false);
    setPositions({});
    positionsRef.current = {};
    saveCanvas();
    requestAnimationFrame(() => fitView({ padding: 0.14, duration: 250 }));
  }, [fitView, saveCanvas]);

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!entry) return;
    if (entry.kind === "positions") {
      setPositions((p) => ({ ...p, ...entry.data }));
      scheduleSave();
    } else if (entry.kind === "link-add") {
      removeLink(entry.link.id, false);
    } else {
      addLink(entry.link, false);
    }
  }, [addLink, removeLink, scheduleSave]);

  // ---- arraste ----
  const dragSnapshot = useRef<PosMap>({});
  const onNodeDragStart = useCallback((_: unknown, __: unknown, dragged: Node[]) => {
    dragSnapshot.current = Object.fromEntries(
      dragged.filter((d) => d.type !== "group").map((d) => [d.id, { ...d.position }]),
    );
  }, []);

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node, dragged: Node[]) => {
      setLineH(undefined);
      setLineV(undefined);

      if (node.type === "group") {
        const gid = (node.data as { groupId: string }).groupId;
        setFrameBoxes((fb) => ({
          ...fb,
          [gid]: {
            x: node.position.x,
            y: node.position.y,
            w: fb[gid]?.w ?? EMPTY_FRAME.w,
            h: fb[gid]?.h ?? EMPTY_FRAME.h,
          },
        }));
        scheduleSave();
        return;
      }

      const moved = (dragged.length ? dragged : [node]).filter(
        (d) => d.type === "area" || d.type === "action",
      );
      if (moved.length) {
        if (Object.keys(dragSnapshot.current).length) {
          pushUndo({ kind: "positions", data: { ...dragSnapshot.current } });
          dragSnapshot.current = {};
        }
        setPositions((p) => {
          const next = { ...p };
          for (const d of moved) next[d.id] = { x: d.position.x, y: d.position.y };
          return next;
        });
        scheduleSave();
      }

      // soltar uma ÁREA dentro de um frame → move pro bloco
      if (groupsActive && node.type === "area") {
        const cx = node.position.x + NODE_SIZE.area.width / 2;
        const cy = node.position.y + NODE_SIZE.area.height / 2;
        const hit = nodesRef.current.find(
          (f) =>
            f.type === "group" &&
            cx >= f.position.x &&
            cx <= f.position.x + ((f.width as number) ?? 0) &&
            cy >= f.position.y &&
            cy <= f.position.y + ((f.height as number) ?? 0),
        );
        const target = hit ? ((hit.data as { groupId: string }).groupId) : null;
        const current = groupOfArea(groups).get(node.id) ?? null;
        if (target !== current) {
          const next = groups.map((g) => ({
            ...g,
            areaIds: g.areaIds.filter((id) => id !== node.id),
          }));
          if (target) next.find((g) => g.id === target)?.areaIds.push(node.id);
          commitGroups(next);
        }
      }
    },
    [groupsActive, groups, commitGroups, pushUndo, scheduleSave],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<PdiNode>[]) => {
      setLineH(undefined);
      setLineV(undefined);
      const c = changes[0];
      if (
        changes.length === 1 &&
        c.type === "position" &&
        c.dragging &&
        c.position &&
        !String(c.id).startsWith("frame-")
      ) {
        const guides = getHelperLines(
          c,
          nodesRef.current.filter((n) => n.type !== "group"),
        );
        if (guides.snapPosition.x != null) c.position.x = guides.snapPosition.x;
        if (guides.snapPosition.y != null) c.position.y = guides.snapPosition.y;
        setLineH(guides.horizontal);
        setLineV(guides.vertical);
      }
      onNodesChange(changes);
    },
    [onNodesChange],
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

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (node.type === "group") {
        const gid = (node.data as { groupId: string }).groupId;
        const g = groups.find((x) => x.id === gid);
        const members = new Set<string>(g?.areaIds ?? []);
        for (const area of pdi.areas) {
          if (members.has(area.id)) area.actions.forEach((a) => members.add(a.id));
        }
        setNodes((ns) =>
          ns.map((n) => ({ ...n, selected: n.id === node.id || members.has(n.id) })),
        );
        setSelected(null);
        return;
      }
      if (node.type === "root" || node.type === "band") {
        setSelected(null);
        return;
      }
      setSelected(node as PdiNode);
    },
    [groups, pdi.areas, setNodes],
  );

  const selectedGroupId = nodes.find((n) => n.type === "group" && n.selected)?.id;
  const selectedGroup = groups.find((g) => `frame-${g.id}` === selectedGroupId);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
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
        onPaneClick={() => {
          setSelected(null);
          clearSelection();
        }}
        deleteKeyCode={["Delete"]}
        selectionMode={SelectionMode.Partial}
        zoomOnDoubleClick={false}
        panOnDrag
        selectionOnDrag={false}
        fitView
        fitViewOptions={{ padding: 0.14 }}
        minZoom={0.06}
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
              <TBtn active={showGroups} onClick={() => setShowGroups((v) => !v)}>▦ Blocos</TBtn>
              <TBtn onClick={addGroup}>+ Bloco</TBtn>
              <TBtn onClick={applySuggestedGroups}>★ Sugeridos</TBtn>
            </Group>
            <Group>
              <TBtn onClick={undo}>
                <span style={{ opacity: canUndo ? 1 : 0.4 }}>↩ Desfazer</span>
              </TBtn>
              <TBtn onClick={reorganize}>⟳ Reorganizar</TBtn>
            </Group>
            <Group>
              <TBtn onClick={saveCanvas}>
                {saveState === "saving" ? "⟳ Salvando…" : saveState === "saved" ? "✓ Salvo" : "💾 Salvar"}
              </TBtn>
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
              <span className="max-w-[160px] truncate font-medium" style={{ color: brand.ink }}>
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
              ? "Arraste a área para dentro de um bloco · clique no bloco p/ mover o conjunto · duplo clique no título renomeia"
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
