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
  resolveSeedGroups,
  type PdiCanvasState,
  type PdiDoc,
  type PdiGroup,
  type PdiLink,
} from "@pdi-mais/core";
import {
  areasInBox,
  EMPTY_FRAME,
  hugBox,
  LAYOUT_LABEL,
  layoutGraph,
  linkEdge,
  NODE_SIZE,
  type FrameBox,
  type GroupNodeData,
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
  const { fitView, screenToFlowPosition } = useReactFlow();

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
  const setFrameBox = useCallback(
    (gid: string, box: FrameBox) => {
      setFrameBoxes((fb) => ({ ...fb, [gid]: box }));
      frameBoxesRef.current = { ...frameBoxesRef.current, [gid]: box };
    },
    [],
  );

  /**
   * Participação = geometria: cada área entra no bloco cujo frame contém o
   * centro do seu card. Frames menores têm prioridade (mais específicos).
   */
  const recapture = useCallback(() => {
    const cur = nodesRef.current;
    const rects = cur
      .filter((n) => n.type === "group")
      .map((n) => {
        const d = n.data as GroupNodeData;
        return {
          gid: d.groupId,
          x: n.position.x,
          y: n.position.y,
          w: (n.width as number) ?? d.width,
          h: (n.height as number) ?? d.height,
        };
      })
      .sort((a, b) => a.w * a.h - b.w * b.h);

    const byGid = new Map(groupsRef.current.map((g) => [g.id, [] as string[]]));
    for (const n of cur) {
      if (n.type !== "area") continue;
      const cx = n.position.x + NODE_SIZE.area.width / 2;
      const cy = n.position.y + NODE_SIZE.area.height / 2;
      const hit = rects.find(
        (f) => cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h,
      );
      if (hit) byGid.get(hit.gid)?.push(n.id);
    }

    const next = groupsRef.current.map((g) => ({ ...g, areaIds: byGid.get(g.id) ?? [] }));
    const changed = next.some(
      (g, i) =>
        [...g.areaIds].sort().join() !== [...groupsRef.current[i].areaIds].sort().join(),
    );
    if (changed) commitGroups(next);
  }, [commitGroups]);

  const applySuggestedGroups = useCallback(() => {
    const sg = resolveSeedGroups(pdi);
    const boxes: Record<string, FrameBox> = {};
    for (const g of sg) {
      const b = hugBox(nodesRef.current, g.areaIds);
      if (b) boxes[g.id] = b;
    }
    setFrameBoxes(boxes);
    frameBoxesRef.current = boxes;
    commitGroups(sg);
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
    const c = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setFrameBox(id, {
      x: c.x - EMPTY_FRAME.w / 2,
      y: c.y - EMPTY_FRAME.h / 2,
      w: EMPTY_FRAME.w,
      h: EMPTY_FRAME.h,
    });
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
  }, [groups, commitGroups, showGroups, screenToFlowPosition, setFrameBox]);
  const deleteGroup = useCallback(
    (id: string) => {
      commitGroups(groups.filter((g) => g.id !== id).map((g, i) => ({ ...g, order: i })));
      setFrameBoxes((fb) => {
        const { [id]: _drop, ...rest } = fb;
        return rest;
      });
      const { [id]: _d, ...rest } = frameBoxesRef.current;
      frameBoxesRef.current = rest;
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
              onResize: (box: FrameBox) => {
                setFrameBox(gid, box);
                scheduleSave();
                requestAnimationFrame(recapture);
              },
            },
          } as PdiNode;
        }
        return n;
      }),
    [patchRoot, renameGroup, recolorGroup, setFrameBox, scheduleSave, recapture],
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
  // arraste de um frame: leva os cards membros junto (estilo FigJam)
  const frameDrag = useRef<{ gid: string; start: Pos; members: PosMap } | null>(null);

  // membros = áreas salvas no bloco ∪ áreas cujo card está dentro do frame agora
  const memberIdsOf = useCallback(
    (gid: string): string[] => {
      const g = groupsRef.current.find((x) => x.id === gid);
      const areaIds = new Set<string>(g?.areaIds ?? []);
      const frameNode = nodesRef.current.find(
        (n) => n.type === "group" && (n.data as GroupNodeData).groupId === gid,
      );
      if (frameNode) {
        const box = {
          x: frameNode.position.x,
          y: frameNode.position.y,
          w: (frameNode.width as number) ?? (frameNode.data as GroupNodeData).width,
          h: (frameNode.height as number) ?? (frameNode.data as GroupNodeData).height,
        };
        for (const id of areasInBox(nodesRef.current, box)) areaIds.add(id);
      }
      const ids = new Set<string>(areaIds);
      for (const area of pdi.areas) {
        if (areaIds.has(area.id)) area.actions.forEach((a) => ids.add(a.id));
      }
      return [...ids];
    },
    [pdi.areas],
  );

  const onNodeDragStart = useCallback(
    (_: unknown, node: Node, dragged: Node[]) => {
      if (node.type === "group") {
        const gid = (node.data as { groupId: string }).groupId;
        const members = memberIdsOf(gid);
        const map: PosMap = {};
        for (const n of nodesRef.current) {
          if (members.includes(n.id)) map[n.id] = { ...n.position };
        }
        frameDrag.current = { gid, start: { ...node.position }, members: map };
        if (Object.keys(map).length) pushUndo({ kind: "positions", data: { ...map } });
        return;
      }
      frameDrag.current = null;
      dragSnapshot.current = Object.fromEntries(
        dragged.filter((d) => d.type !== "group").map((d) => [d.id, { ...d.position }]),
      );
    },
    [memberIdsOf, pushUndo],
  );

  const onNodeDrag = useCallback((_: unknown, node: Node) => {
    const fd = frameDrag.current;
    if (node.type !== "group" || !fd || fd.gid !== (node.data as { groupId: string }).groupId) {
      return;
    }
    const dx = node.position.x - fd.start.x;
    const dy = node.position.y - fd.start.y;
    setNodes((ns) =>
      ns.map((n) =>
        fd.members[n.id]
          ? { ...n, position: { x: fd.members[n.id].x + dx, y: fd.members[n.id].y + dy } }
          : n,
      ),
    );
  }, [setNodes]);

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node, dragged: Node[]) => {
      setLineH(undefined);
      setLineV(undefined);

      if (node.type === "group") {
        const gid = (node.data as { groupId: string }).groupId;
        setFrameBox(gid, {
          x: node.position.x,
          y: node.position.y,
          w: (node.width as number) ?? frameBoxesRef.current[gid]?.w ?? EMPTY_FRAME.w,
          h: (node.height as number) ?? frameBoxesRef.current[gid]?.h ?? EMPTY_FRAME.h,
        });
        const fd = frameDrag.current;
        frameDrag.current = null;
        if (fd && fd.gid === gid) {
          const dx = node.position.x - fd.start.x;
          const dy = node.position.y - fd.start.y;
          setPositions((p) => {
            const next = { ...p };
            for (const [id, p0] of Object.entries(fd.members)) {
              next[id] = { x: p0.x + dx, y: p0.y + dy };
            }
            return next;
          });
        }
        recapture();
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
        if (groupsActive) recapture();
      }
    },
    [groupsActive, recapture, pushUndo, scheduleSave, setFrameBox],
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

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.type === "group" || node.type === "root" || node.type === "band") {
      setSelected(null);
      return;
    }
    setSelected(node as PdiNode);
  }, []);

  // Selecionou SÓ um frame de bloco (clique na barra) → puxa os cards dele junto.
  const selChangeGuard = useRef(false);
  const onSelectionChange = useCallback(
    ({ nodes: sel }: { nodes: Node[] }) => {
      if (selChangeGuard.current) return;
      if (sel.length === 1 && sel[0].type === "group") {
        const gid = (sel[0].data as { groupId: string }).groupId;
        const members = new Set<string>(memberIdsOf(gid));
        selChangeGuard.current = true;
        setNodes((ns) =>
          ns.map((n) =>
            n.id === sel[0].id || members.has(n.id)
              ? n.selected
                ? n
                : { ...n, selected: true }
              : n,
          ),
        );
        requestAnimationFrame(() => (selChangeGuard.current = false));
      }
    },
    [memberIdsOf, setNodes],
  );

  // Caixa de seleção (Shift+arraste) nunca deve "pegar" um frame de bloco.
  const onSelectionEnd = useCallback(() => {
    setNodes((ns) =>
      ns.filter((n) => n.type === "group" && n.selected).length && ns.some((n) => n.selected && n.type !== "group")
        ? ns.map((n) => (n.type === "group" ? { ...n, selected: false } : n))
        : ns,
    );
  }, [setNodes]);

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
        onSelectionChange={onSelectionChange}
        onSelectionEnd={onSelectionEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
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
        panActivationKeyCode="Space"
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
              className="flex flex-col gap-1 rounded-md border bg-white px-3 py-2 text-xs shadow-sm"
              style={{ borderColor: brand.border }}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: selectedGroup.color }} />
                <span className="max-w-[180px] truncate font-semibold" style={{ color: brand.ink }}>
                  {selectedGroup.title}
                </span>
                <button
                  type="button"
                  onClick={() => deleteGroup(selectedGroup.id)}
                  className="ml-auto rounded px-1.5 py-0.5 font-medium hover:bg-neutral-100"
                  style={{ color: "#DC2626" }}
                >
                  ✕ Excluir
                </button>
              </div>
              <div style={{ color: brand.muted }}>
                Alças ▪ nas 4 pontas redimensionam · o que ficar dentro entra no bloco
              </div>
            </div>
          </Panel>
        )}

        <Panel position="bottom-center">
          <div
            className="max-w-[92vw] rounded-full border bg-white/95 px-4 py-1.5 text-center text-[11px] shadow-sm backdrop-blur"
            style={{ borderColor: brand.border, color: brand.muted }}
          >
            {groupsActive ? (
              <>
                <b style={{ color: brand.ink }}>Barra colorida do bloco:</b> clicar = seleciona ·
                arrastar = move o bloco + cards &nbsp;·&nbsp;
                <b style={{ color: brand.ink }}>Card:</b> arrastar = move só ele ·
                <b style={{ color: brand.ink }}> Shift+arrastar</b> = caixa de seleção ·
                <b style={{ color: brand.ink }}> Espaço</b> = navegar
              </>
            ) : (
              "Arraste da bolinha de um card até outro para conectar · Shift+arraste seleciona vários · Ctrl+Z desfaz"
            )}
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
