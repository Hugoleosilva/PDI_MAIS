import Dagre from "@dagrejs/dagre";
import {
  areaProgress,
  groupOfArea,
  hasNotStarted,
  overallProgress,
  type ActionKind,
  type PdiDoc,
  type PdiGroup,
  type PdiLink,
  type Status,
} from "@pdi-mais/core";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { statusStyle } from "./theme";

/** Direção dos handles nos nós (de onde saem/entram as conexões). */
export type Direction = "LR" | "TB";

/** Formatos de layout que o usuário pode escolher. */
export type Layout = "tree-lr" | "tree-tb" | "kanban" | "swimlane" | "radial";

export const LAYOUT_LABEL: Record<Layout, string> = {
  "tree-lr": "Árvore →",
  "tree-tb": "Árvore ↓",
  kanban: "Kanban (status)",
  swimlane: "Raias (área)",
  radial: "Radial",
};

export const NODE_SIZE = {
  root: { width: 250, height: 168 },
  area: { width: 264, height: 96 },
  action: { width: 320, height: 112 },
  band: { width: 320, height: 40 },
} as const;

const STATUS_ORDER: Status[] = ["todo", "doing", "done"];

export interface RootNodeData extends Record<string, unknown> {
  title: string;
  track?: string;
  progress: number;
  areaCount: number;
  dir: Direction;
  onEditTitle?: (v: string) => void;
  onEditTrack?: (v: string) => void;
}

export interface AreaNodeData extends Record<string, unknown> {
  title: string;
  status: Status;
  progress: number;
  actionCount: number;
  hasNotStarted: boolean;
  description?: string;
  dir: Direction;
}

export interface ActionNodeData extends Record<string, unknown> {
  title: string;
  status: Status;
  dueDate?: string;
  kind: ActionKind;
  description?: string;
  areaId: string;
  areaTitle: string;
  dir: Direction;
}

export interface BandNodeData extends Record<string, unknown> {
  label: string;
  sub?: string;
  accent: string;
  variant: "column" | "lane";
  width: number;
  height: number;
}

export interface GroupNodeData extends Record<string, unknown> {
  groupId: string;
  title: string;
  color: string;
  width: number;
  height: number;
  onRename?: (v: string) => void;
  onRecolor?: () => void;
}

export type PdiNode =
  | Node<RootNodeData, "root">
  | Node<AreaNodeData, "area">
  | Node<ActionNodeData, "action">
  | Node<BandNodeData, "band">
  | Node<GroupNodeData, "group">;

const ROOT_ID = "root";

function dirFor(layout: Layout): Direction {
  return layout === "tree-tb" || layout === "kanban" ? "TB" : "LR";
}

// ---------------------------------------------------------------------------
// Construção dos nós/arestas base (sem posição)
// ---------------------------------------------------------------------------

function baseNodes(pdi: PdiDoc, dir: Direction) {
  const root: Node<RootNodeData, "root"> = {
    id: ROOT_ID,
    type: "root",
    position: { x: 0, y: 0 },
    data: {
      title: pdi.root.title,
      track: pdi.root.track,
      progress: overallProgress(pdi.areas),
      areaCount: pdi.areas.length,
      dir,
    },
  };

  const areaNodes: Node<AreaNodeData, "area">[] = pdi.areas.map((area) => ({
    id: area.id,
    type: "area",
    position: { x: 0, y: 0 },
    data: {
      title: area.title,
      status: area.status,
      progress: areaProgress(area),
      actionCount: area.actions.length,
      hasNotStarted: hasNotStarted(area),
      description: area.description,
      dir,
    },
  }));

  const actionNodes: Node<ActionNodeData, "action">[] = pdi.areas.flatMap((area) =>
    area.actions.map((action) => ({
      id: action.id,
      type: "action" as const,
      position: { x: 0, y: 0 },
      data: {
        title: action.title,
        status: action.status,
        dueDate: action.dueDate,
        kind: action.kind,
        description: action.description,
        areaId: area.id,
        areaTitle: area.title,
        dir,
      },
    })),
  );

  return { root, areaNodes, actionNodes };
}

function structuralEdge(source: string, target: string, status: Status): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: "smoothstep",
    animated: status === "doing",
    deletable: false,
    selectable: false,
    style: {
      strokeWidth: status === "todo" ? 1 : 1.75,
      opacity: status === "todo" ? 0.4 : 1,
    },
  };
}

function treeEdges(pdi: PdiDoc): Edge[] {
  const edges: Edge[] = [];
  for (const area of pdi.areas) {
    edges.push(structuralEdge(ROOT_ID, area.id, area.status));
    for (const action of area.actions) {
      edges.push(structuralEdge(area.id, action.id, action.status));
    }
  }
  return edges;
}

/** Conexão manual (estilo n8n): curva, com seta e botão de remover ao selecionar. */
export function linkEdge(link: PdiLink): Edge {
  return {
    id: link.id,
    source: link.source,
    target: link.target,
    type: "link",
    deletable: true,
    selectable: true,
    focusable: true,
    interactionWidth: 32,
    data: { userLink: true, label: link.label },
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  };
}

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

function treeLayout(pdi: PdiDoc, dir: Direction, groups: PdiGroup[]) {
  const { root, areaNodes, actionNodes } = baseNodes(pdi, dir);
  const nodes = [root, ...areaNodes, ...actionNodes];
  const edges = treeEdges(pdi);

  const areaToGroup = groupOfArea(groups);
  const usedGroups = new Set(
    pdi.areas.map((a) => areaToGroup.get(a.id)).filter((x): x is string => Boolean(x)),
  );

  const g = new Dagre.graphlib.Graph({ compound: usedGroups.size > 0 }).setDefaultEdgeLabel(
    () => ({}),
  );
  g.setGraph({
    rankdir: dir,
    nodesep: dir === "LR" ? 16 : 26,
    ranksep: dir === "LR" ? 84 : 64,
    marginx: 24,
    marginy: 24,
  });
  for (const gid of usedGroups) g.setNode(gid, {});
  for (const n of nodes) {
    const s = NODE_SIZE[n.type];
    g.setNode(n.id, { width: s.width, height: s.height });
  }
  for (const area of pdi.areas) {
    const gid = areaToGroup.get(area.id);
    if (gid && usedGroups.has(gid)) {
      g.setParent(area.id, gid);
      for (const act of area.actions) g.setParent(act.id, gid);
    }
  }
  for (const e of edges) g.setEdge(e.source, e.target);
  Dagre.layout(g);

  const positioned = nodes.map((n) => {
    const { x, y } = g.node(n.id);
    const s = NODE_SIZE[n.type];
    return { ...n, position: { x: x - s.width / 2, y: y - s.height / 2 } };
  });
  return { nodes: positioned as PdiNode[], edges };
}

const FRAME_PAD = 22;
const FRAME_TITLE = 34;
const EMPTY_FRAME = { w: 300, h: 120 };

/**
 * Frames dos blocos, calculados a partir das posições atuais dos nós — assim o
 * frame "abraça" os cards mesmo depois de arrastados. Blocos vazios ganham um
 * frame placeholder na coluna da esquerda.
 */
export function computeFrames(
  nodes: PdiNode[],
  groups: PdiGroup[],
): Node<GroupNodeData, "group">[] {
  const areaToGroup = groupOfArea(groups);
  const rects = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

  for (const n of nodes) {
    let gid: string | undefined;
    if (n.type === "area") gid = areaToGroup.get(n.id);
    else if (n.type === "action") gid = areaToGroup.get((n.data as ActionNodeData).areaId);
    if (!gid) continue;
    const s = NODE_SIZE[n.type as "area" | "action"];
    const r = rects.get(gid);
    const x1 = n.position.x;
    const y1 = n.position.y;
    const x2 = x1 + s.width;
    const y2 = y1 + s.height;
    rects.set(
      gid,
      r
        ? {
            minX: Math.min(r.minX, x1),
            minY: Math.min(r.minY, y1),
            maxX: Math.max(r.maxX, x2),
            maxY: Math.max(r.maxY, y2),
          }
        : { minX: x1, minY: y1, maxX: x2, maxY: y2 },
    );
  }

  let emptyIndex = 0;
  return [...groups]
    .sort((a, b) => a.order - b.order)
    .map((grp) => {
      const r = rects.get(grp.id);
      let x: number;
      let y: number;
      let width: number;
      let height: number;
      if (r) {
        x = r.minX - FRAME_PAD;
        y = r.minY - FRAME_PAD - FRAME_TITLE;
        width = r.maxX - r.minX + FRAME_PAD * 2;
        height = r.maxY - r.minY + FRAME_PAD * 2 + FRAME_TITLE;
      } else {
        x = -EMPTY_FRAME.w - 120;
        y = emptyIndex++ * (EMPTY_FRAME.h + 24);
        width = EMPTY_FRAME.w;
        height = EMPTY_FRAME.h;
      }
      return {
        id: `frame-${grp.id}`,
        type: "group" as const,
        position: { x, y },
        width,
        height,
        selectable: false,
        draggable: false,
        deletable: false,
        connectable: false,
        zIndex: -1,
        data: { groupId: grp.id, title: grp.title, color: grp.color, width, height },
      };
    });
}

function kanbanLayout(pdi: PdiDoc) {
  const colW = 360;
  const gapX = 40;
  const cardGap = 14;
  const headerH = 44;
  const { root, actionNodes } = baseNodes(pdi, "TB");

  const areaOrder = new Map(pdi.areas.map((a, i) => [a.title, i]));
  const byStatus = (s: Status) =>
    actionNodes
      .filter((n) => n.data.status === s)
      .sort(
        (a, b) =>
          (areaOrder.get(a.data.areaTitle) ?? 0) - (areaOrder.get(b.data.areaTitle) ?? 0),
      );

  const nodes: PdiNode[] = [
    { ...root, position: { x: 0, y: -NODE_SIZE.root.height - 40 } },
  ];

  STATUS_ORDER.forEach((s, col) => {
    const x0 = col * (colW + gapX);
    const items = byStatus(s);
    const st = statusStyle(s, "action");
    nodes.push({
      id: `band-${s}`,
      type: "band",
      position: { x: x0, y: 0 },
      draggable: false,
      selectable: false,
      data: {
        label: st.label,
        sub: `${items.length}`,
        accent: st.accent,
        variant: "column",
        width: colW,
        height: headerH,
      },
    });
    let y = headerH + 16;
    for (const n of items) {
      nodes.push({
        ...n,
        position: { x: x0 + (colW - NODE_SIZE.action.width) / 2, y },
      });
      y += NODE_SIZE.action.height + cardGap;
    }
  });

  return { nodes, edges: [] as Edge[] };
}

function swimlaneLayout(pdi: PdiDoc) {
  const labelW = 200;
  const gap = 20;
  const padY = 14;
  const laneH = NODE_SIZE.action.height + padY * 2 + 8;
  const { root, actionNodes } = baseNodes(pdi, "LR");
  const actById = new Map(actionNodes.map((n) => [n.id, n]));

  const nodes: PdiNode[] = [
    { ...root, position: { x: -NODE_SIZE.root.width - 40, y: 0 } },
  ];
  const edges: Edge[] = [];

  pdi.areas.forEach((area, i) => {
    const y0 = i * (laneH + 12);
    const st = statusStyle(area.status, "area");
    const laneW = labelW + area.actions.length * (NODE_SIZE.action.width + gap) + 40;
    nodes.push({
      id: `lane-${area.id}`,
      type: "band",
      position: { x: 0, y: y0 },
      draggable: false,
      selectable: false,
      zIndex: -1,
      data: {
        label: area.title,
        sub: `${Math.round(areaProgress(area) * 100)}%`,
        accent: st.accent,
        variant: "lane",
        width: laneW,
        height: laneH,
      },
    });
    area.actions.forEach((action, j) => {
      const n = actById.get(action.id);
      if (!n) return;
      nodes.push({
        ...n,
        position: { x: labelW + j * (NODE_SIZE.action.width + gap), y: y0 + padY },
      });
      if (j === 0) edges.push(structuralEdge(ROOT_ID, action.id, action.status));
    });
  });

  return { nodes, edges };
}

function radialLayout(pdi: PdiDoc) {
  const { root, areaNodes, actionNodes } = baseNodes(pdi, "LR");
  const actById = new Map(actionNodes.map((n) => [n.id, n]));
  const n = Math.max(pdi.areas.length, 1);
  const R1 = Math.max(360, n * 70);
  const nodes: PdiNode[] = [
    { ...root, position: { x: -NODE_SIZE.root.width / 2, y: -NODE_SIZE.root.height / 2 } },
  ];
  const edges = treeEdges(pdi);

  pdi.areas.forEach((area, i) => {
    const ang = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    const areaNode = areaNodes.find((a) => a.id === area.id)!;
    nodes.push({
      ...areaNode,
      position: {
        x: Math.cos(ang) * R1 - NODE_SIZE.area.width / 2,
        y: Math.sin(ang) * R1 - NODE_SIZE.area.height / 2,
      },
    });

    const k = area.actions.length;
    const spread = Math.min(1.4, 0.35 * k);
    const R2 = R1 + 260 + k * 8;
    area.actions.forEach((action, j) => {
      const node = actById.get(action.id);
      if (!node) return;
      const a = k > 1 ? ang - spread / 2 + (j / (k - 1)) * spread : ang;
      nodes.push({
        ...node,
        position: {
          x: Math.cos(a) * R2 - NODE_SIZE.action.width / 2,
          y: Math.sin(a) * R2 - NODE_SIZE.action.height / 2,
        },
      });
    });
  });

  return { nodes, edges };
}

// ---------------------------------------------------------------------------

/** Monta nós + arestas para o layout escolhido. Links manuais ficam por cima. */
export function layoutGraph(
  pdi: PdiDoc,
  opts: { layout?: Layout; links?: PdiLink[]; groups?: PdiGroup[] } = {},
): { nodes: PdiNode[]; edges: Edge[] } {
  const layout = opts.layout ?? "tree-lr";
  const groups = opts.groups ?? [];

  let result: { nodes: PdiNode[]; edges: Edge[] };
  if (layout === "kanban") result = kanbanLayout(pdi);
  else if (layout === "swimlane") result = swimlaneLayout(pdi);
  else if (layout === "radial") result = radialLayout(pdi);
  else result = treeLayout(pdi, dirFor(layout), groups);

  const linkEdges = (opts.links ?? pdi.links ?? []).map(linkEdge);
  return { nodes: result.nodes, edges: [...result.edges, ...linkEdges] };
}
