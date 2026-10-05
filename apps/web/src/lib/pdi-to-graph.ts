import Dagre from "@dagrejs/dagre";
import {
  areaProgress,
  deriveAreaStatus,
  groupOfArea,
  hasNotStarted,
  overallProgress,
  type Area,
  type ActionKind,
  type PdiDoc,
  type PdiGroup,
  type PdiLink,
  type PdiShape,
  type Status,
} from "@pdi-mais/core";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { brand, statusStyle } from "./theme";

/** Direção dos handles nos nós (de onde saem/entram as conexões). */
export type Direction = "LR" | "TB";

/** Formatos de layout que o usuário pode escolher. */
export type Layout = "tree-lr" | "tree-tb" | "kanban" | "swimlane" | "radial" | "roadmap";

export const LAYOUT_LABEL: Record<Layout, string> = {
  "tree-lr": "Árvore →",
  "tree-tb": "Árvore ↓",
  kanban: "Kanban (status)",
  swimlane: "Raias (área)",
  radial: "Radial",
  roadmap: "Roadmap (bloco)",
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
  /** Quantos blocos existem — pra não confundir "quantas áreas" com "como estão organizadas". */
  groupCount: number;
  dir: Direction;
  /** Tamanho redimensionado pelo usuário (sobrepõe NODE_SIZE.root). */
  width?: number;
  height?: number;
  /** Objetivo geral ("pra onde estou indo") — igual à anotação do bloco. */
  note?: string;
  /** Rótulo da anotação acima ("Objetivo" por padrão) — editável. */
  noteTitle?: string;
  onEditTitle?: (v: string) => void;
  onEditTrack?: (v: string) => void;
  onEditNote?: (v: string) => void;
  onEditNoteTitle?: (v: string) => void;
  onResize?: (size: { w: number; h: number }) => void;
}

export interface AreaNodeData extends Record<string, unknown> {
  title: string;
  status: Status;
  progress: number;
  actionCount: number;
  hasNotStarted: boolean;
  description?: string;
  dir: Direction;
  /** "roadmap" = card esmaecido se "todo", com destaque se "doing" (linha do tempo). */
  variant?: "roadmap";
}

export interface ActionNodeData extends Record<string, unknown> {
  title: string;
  status: Status;
  dueDate?: string;
  kind: ActionKind;
  description?: string;
  certificateUrl?: string;
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
  empty: boolean;
  isSelected: boolean;
  /** Andamento médio das áreas que estão dentro (mesma conta do card da área); ausente = bloco vazio. */
  progress?: number;
  /** Quantitativo de ações das áreas de dentro, por status. */
  actionStats?: { total: number; todo: number; doing: number; done: number };
  /** Pausado no Planejamento — só indicador visual aqui, sem ação no canvas. */
  paused?: boolean;
  note?: string;
  noteColor?: string;
  onRename?: (v: string) => void;
  onRecolor?: (color: string) => void;
  onResize?: (box: FrameBox) => void;
  onEditNote?: (v: string) => void;
  onNoteColor?: (color: string) => void;
}

export interface ShapeNodeData extends Record<string, unknown> {
  shapeId: string;
  color: string;
  text?: string;
  onResize?: (box: { x: number; y: number; w: number; h: number }) => void;
  onRecolor?: (color: string) => void;
  onEditText?: (v: string) => void;
  onDelete?: () => void;
}

export type PdiNode =
  | Node<RootNodeData, "root">
  | Node<AreaNodeData, "area">
  | Node<ActionNodeData, "action">
  | Node<BandNodeData, "band">
  | Node<GroupNodeData, "group">
  | Node<ShapeNodeData, "shape">;

/** Converte os quadros de anotação livre em nós RF — 1:1, sem "abraço" nenhum. */
export function shapeNodes(shapes: PdiShape[]): Node<ShapeNodeData, "shape">[] {
  return shapes.map((s) => ({
    id: `shape-${s.id}`,
    type: "shape",
    position: { x: s.x, y: s.y },
    width: s.w,
    height: s.h,
    selectable: true,
    connectable: true,
    deletable: false,
    // fica acima de blocos/faixas (zIndex 0/-1) mas abaixo dos cards
    // (zIndex 1) — clicável mesmo sobre um bloco, sem tampar card nenhum.
    zIndex: 0,
    data: { shapeId: s.id, color: s.color, text: s.text },
  }));
}

const ROOT_ID = "root";

function dirFor(layout: Layout): Direction {
  return layout === "tree-tb" || layout === "kanban" ? "TB" : "LR";
}

// ---------------------------------------------------------------------------
// Construção dos nós/arestas base (sem posição)
// ---------------------------------------------------------------------------

function baseNodes(
  pdi: PdiDoc,
  dir: Direction,
  rootSize?: { w: number; h: number },
  hideActions = false,
) {
  const root: Node<RootNodeData, "root"> = {
    id: ROOT_ID,
    type: "root",
    position: { x: 0, y: 0 },
    // Sempre abaixo de TUDO (área/ação=1, bloco/raia=0 ou -1) — o usuário
    // pode arrastar o raiz pra qualquer lugar, inclusive por cima de um
    // bloco/card na horizontal, sem nunca cobrir o conteúdo visualmente.
    zIndex: -2,
    data: {
      title: pdi.root.title,
      track: pdi.root.track,
      progress: overallProgress(pdi.areas),
      areaCount: pdi.areas.length,
      groupCount: pdi.groups?.length ?? 0,
      dir,
      width: rootSize?.w,
      height: rootSize?.h,
      note: pdi.root.note,
      noteTitle: pdi.root.noteTitle,
    },
  };

  const areaNodes: Node<AreaNodeData, "area">[] = pdi.areas.map((area) => ({
    id: area.id,
    type: "area",
    position: { x: 0, y: 0 },
    zIndex: 1,
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

  const actionNodes: Node<ActionNodeData, "action">[] = hideActions
    ? []
    : pdi.areas.flatMap((area) =>
        area.actions.map((action) => ({
          id: action.id,
          type: "action" as const,
          position: { x: 0, y: 0 },
          zIndex: 1,
          data: {
            title: action.title,
            status: action.status,
            dueDate: action.dueDate,
            kind: action.kind,
            description: action.description,
            certificateUrl: action.certificateUrl,
            areaId: area.id,
            areaTitle: area.title,
            dir,
          },
        })),
      );

  return { root, areaNodes, actionNodes };
}

/**
 * Aresta estrutural (raiz→bloco/área, área→ação): cor vem do status de quem
 * "sai" da seta — verde sólido (feito), laranja tracejado animado (em
 * andamento), cinza tracejado apagado (futuro/bloqueado). Mesma paleta de
 * `statusStyle` em todo lugar, sem linha cinza genérica nem cor inventada.
 */
function structuralEdge(source: string, target: string, status: Status): Edge {
  const accent = statusStyle(status, "area").accent;
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: "smoothstep",
    animated: status === "doing",
    deletable: false,
    selectable: false,
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: accent },
    style: {
      stroke: accent,
      strokeWidth: status === "todo" ? 1.25 : 2,
      strokeDasharray: status === "done" ? undefined : "6,4",
      opacity: status === "todo" ? 0.45 : 1,
    },
  };
}

/** Arestas usadas pelo Dagre para o cálculo (sempre a árvore completa). */
function dagreEdges(pdi: PdiDoc, hideActions = false): Edge[] {
  const edges: Edge[] = [];
  for (const area of pdi.areas) {
    edges.push(structuralEdge(ROOT_ID, area.id, area.status));
    if (hideActions) continue;
    for (const action of area.actions) {
      edges.push(structuralEdge(area.id, action.id, action.status));
    }
  }
  return edges;
}

/**
 * Arestas exibidas. Com blocos: a raiz liga no FRAME de cada bloco (menos
 * linhas cruzando); áreas soltas ligam direto na raiz. Ações sempre ligam na área.
 */
function renderEdges(pdi: PdiDoc, groups: PdiGroup[], hideActions = false): Edge[] {
  const areaToGroup = groupOfArea(groups);
  const edges: Edge[] = [];
  const framesLinked = new Set<string>();
  // status do bloco = status derivado do conjunto de ações de todas as suas
  // áreas — mesma regra de `deriveAreaStatus`, só que aplicada num nível acima.
  const actionsByArea = new Map(pdi.areas.map((a) => [a.id, a.actions]));
  const groupStatus = (gid: string): Status =>
    deriveAreaStatus(
      (groups.find((g) => g.id === gid)?.areaIds ?? []).flatMap(
        (aid) => actionsByArea.get(aid) ?? [],
      ),
    );

  for (const area of pdi.areas) {
    const gid = areaToGroup.get(area.id);
    if (gid) {
      if (!framesLinked.has(gid)) {
        edges.push(structuralEdge(ROOT_ID, `frame-${gid}`, groupStatus(gid)));
        framesLinked.add(gid);
      }
    } else {
      edges.push(structuralEdge(ROOT_ID, area.id, area.status));
    }
    if (hideActions) continue;
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

function treeLayout(
  pdi: PdiDoc,
  dir: Direction,
  groups: PdiGroup[],
  positions: Record<string, { x: number; y: number }>,
  framesBoxes: Record<string, FrameBox>,
  rootSize?: { w: number; h: number },
  hideActions = false,
  savedRoot?: { x: number; y: number },
) {
  const { root, areaNodes, actionNodes } = baseNodes(pdi, dir, rootSize, hideActions);
  const nodes = [root, ...areaNodes, ...actionNodes];

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
    ranksep: dir === "LR" ? 96 : 68,
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
  for (const e of dagreEdges(pdi, hideActions)) g.setEdge(e.source, e.target);
  Dagre.layout(g);

  const positioned = nodes.map((n) => {
    const s = NODE_SIZE[n.type];
    // Raiz: usa a posição arrastada PARA ESTE FORMATO (savedRoot), nunca o
    // mapa genérico `positions` — o Dagre recalcula a árvore inteira a cada
    // mudança de bloco, e se o raiz lesse dali ele "herdaria" uma posição de
    // antes que não faz mais sentido geometricamente. Sem arraste salvo,
    // cai no que o Dagre calcular (mesmo caminho de área/ação).
    const saved = n.type === "root" ? savedRoot : positions[n.id];
    if (saved) return { ...n, position: { ...saved } };
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - s.width / 2, y: y - s.height / 2 } };
  }) as PdiNode[];

  const frames = computeFrames(positioned, groups, framesBoxes, pdi);
  return {
    nodes: [...frames, ...positioned] as PdiNode[],
    edges: renderEdges(pdi, groups, hideActions),
  };
}

const FRAME_PAD = 26;
const FRAME_TITLE = 36;
export const EMPTY_FRAME = { w: 520, h: 340 };

export type FrameBox = { x: number; y: number; w: number; h: number };

/** Caixa que "abraça" os cards das áreas dadas (+ suas ações). null se nenhum. */
export function hugBox(nodes: PdiNode[], areaIds: string[]): FrameBox | null {
  const set = new Set(areaIds);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const isMember =
      (n.type === "area" && set.has(n.id)) ||
      (n.type === "action" && set.has((n.data as ActionNodeData).areaId));
    if (!isMember) continue;
    const s = NODE_SIZE[n.type as "area" | "action"];
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + s.width);
    maxY = Math.max(maxY, n.position.y + s.height);
  }
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX - FRAME_PAD,
    y: minY - FRAME_PAD - FRAME_TITLE,
    w: maxX - minX + FRAME_PAD * 2,
    h: maxY - minY + FRAME_PAD * 2 + FRAME_TITLE,
  };
}

/** IDs das áreas cujo centro do card cai dentro da caixa. */
export function areasInBox(nodes: PdiNode[], box: FrameBox): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (n.type !== "area") continue;
    const cx = n.position.x + NODE_SIZE.area.width / 2;
    const cy = n.position.y + NODE_SIZE.area.height / 2;
    if (cx >= box.x && cx <= box.x + box.w && cy >= box.y && cy <= box.y + box.h) {
      out.push(n.id);
    }
  }
  return out;
}

/**
 * Frames dos blocos. Cada bloco tem uma caixa manual (`frameBoxes[id]`);
 * se ainda não tiver, abraça os membros atuais, e por fim um default.
 * A participação (quem está no bloco) vem da GEOMETRIA — ver `areasInBox`.
 */
export function computeFrames(
  nodes: PdiNode[],
  groups: PdiGroup[],
  frameBoxes: Record<string, FrameBox> = {},
  pdi?: PdiDoc,
): Node<GroupNodeData, "group">[] {
  let fallbackIndex = 0;
  const refX = Math.min(0, ...nodes.map((n) => n.position.x));
  const refBottom = Math.max(
    0,
    ...nodes.map(
      (n) => n.position.y + (NODE_SIZE[n.type as keyof typeof NODE_SIZE]?.height ?? 110),
    ),
  );

  // Andamento do bloco = média do progresso das áreas de dentro — lê direto
  // do AreaNode (já traz `progress` calculado por `areaProgress`).
  const areaProgressById = new Map(
    nodes.filter((n) => n.type === "area").map((n) => [n.id, (n.data as AreaNodeData).progress]),
  );
  const groupProgress = (areaIds: string[]): number | undefined => {
    const vals = areaIds
      .map((id) => areaProgressById.get(id))
      .filter((v): v is number => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : undefined;
  };

  // Quantitativo de ações do bloco — quantas faltam iniciar, em andamento, finalizadas.
  // Lê direto do `pdi.areas` (dado real), não dos nós renderizados — no modo
  // macro os cards de ação somem do canvas, mas o total do bloco não pode
  // cair pra zero por causa disso.
  const actionsByAreaId = new Map((pdi?.areas ?? []).map((a) => [a.id, a.actions]));
  const actionNodesAll = nodes.filter(
    (n): n is Node<ActionNodeData, "action"> => n.type === "action",
  );
  const groupActionStats = (areaIds: string[]) => {
    if (pdi) {
      const acts = areaIds.flatMap((id) => actionsByAreaId.get(id) ?? []);
      return {
        total: acts.length,
        todo: acts.filter((a) => a.status === "todo").length,
        doing: acts.filter((a) => a.status === "doing").length,
        done: acts.filter((a) => a.status === "done").length,
      };
    }
    const set = new Set(areaIds);
    const acts = actionNodesAll.filter((n) => set.has(n.data.areaId));
    return {
      total: acts.length,
      todo: acts.filter((n) => n.data.status === "todo").length,
      doing: acts.filter((n) => n.data.status === "doing").length,
      done: acts.filter((n) => n.data.status === "done").length,
    };
  };

  return [...groups]
    .sort((a, b) => a.order - b.order)
    .map((grp) => {
      const box =
        frameBoxes[grp.id] ??
        hugBox(nodes, grp.areaIds) ?? {
          x: refX,
          y: refBottom + 80 + fallbackIndex++ * (EMPTY_FRAME.h + 40),
          w: EMPTY_FRAME.w,
          h: EMPTY_FRAME.h,
        };

      return {
        id: `frame-${grp.id}`,
        type: "group" as const,
        position: { x: box.x, y: box.y },
        width: box.w,
        height: box.h,
        // RF nunca seleciona o frame; a seleção do bloco é um estado à parte.
        selectable: false,
        draggable: true,
        deletable: false,
        connectable: false,
        zIndex: 0,
        data: {
          groupId: grp.id,
          title: grp.title,
          color: grp.color,
          width: box.w,
          height: box.h,
          empty: grp.areaIds.length === 0,
          isSelected: false,
          progress: groupProgress(grp.areaIds),
          actionStats: groupActionStats(grp.areaIds),
          paused: grp.paused,
          note: grp.note,
          noteColor: grp.noteColor,
        },
      };
    });
}

function kanbanLayout(
  pdi: PdiDoc,
  rootSize?: { w: number; h: number },
  savedRoot?: { x: number; y: number },
) {
  const colW = 360;
  const gapX = 40;
  const cardGap = 14;
  const headerH = 44;
  const { root, actionNodes } = baseNodes(pdi, "TB", rootSize);
  const rootH = rootSize?.h ?? NODE_SIZE.root.height;

  const areaOrder = new Map(pdi.areas.map((a, i) => [a.title, i]));
  const byStatus = (s: Status) =>
    actionNodes
      .filter((n) => n.data.status === s)
      .sort(
        (a, b) =>
          (areaOrder.get(a.data.areaTitle) ?? 0) - (areaOrder.get(b.data.areaTitle) ?? 0),
      );

  const nodes: PdiNode[] = [
    { ...root, position: savedRoot ?? { x: 0, y: -rootH - 40 } },
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

function swimlaneLayout(
  pdi: PdiDoc,
  rootSize?: { w: number; h: number },
  hideActions = false,
  savedRoot?: { x: number; y: number },
) {
  const labelW = 200;
  const gap = 20;
  const padY = 14;
  const laneH = NODE_SIZE.action.height + padY * 2 + 8;
  const { root, actionNodes } = baseNodes(pdi, "LR", rootSize, hideActions);
  const actById = new Map(actionNodes.map((n) => [n.id, n]));
  const rootW = rootSize?.w ?? NODE_SIZE.root.width;

  const nodes: PdiNode[] = [
    { ...root, position: savedRoot ?? { x: -rootW - 40, y: 0 } },
  ];
  const edges: Edge[] = [];

  pdi.areas.forEach((area, i) => {
    const y0 = i * (laneH + 12);
    const st = statusStyle(area.status, "area");
    const laneW =
      labelW + (hideActions ? 0 : area.actions.length * (NODE_SIZE.action.width + gap)) + 40;
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
    if (hideActions) {
      // sem card de ação nenhum pra apontar — liga direto na raia (a área).
      edges.push(structuralEdge(ROOT_ID, `lane-${area.id}`, area.status));
      return;
    }
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

function radialLayout(
  pdi: PdiDoc,
  rootSize?: { w: number; h: number },
  hideActions = false,
  savedRoot?: { x: number; y: number },
) {
  const { root, areaNodes, actionNodes } = baseNodes(pdi, "LR", rootSize, hideActions);
  const actById = new Map(actionNodes.map((n) => [n.id, n]));
  const n = Math.max(pdi.areas.length, 1);
  const R1 = Math.max(360, n * 70);
  const rootW = rootSize?.w ?? NODE_SIZE.root.width;
  const rootH = rootSize?.h ?? NODE_SIZE.root.height;
  const nodes: PdiNode[] = [
    { ...root, position: savedRoot ?? { x: -rootW / 2, y: -rootH / 2 } },
  ];
  const edges = renderEdges(pdi, [], hideActions);

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

/**
 * Roadmap: raia = BLOCO (macro-domínio), card = ÁREA (curso/formação) — nível
 * mais alto que a Raias normal (que é raia=área, card=ação). Sem módulos no
 * canvas aqui de propósito: clicar num card abre a gaveta com a lista deles
 * (mesmo mecanismo do modo macro). Dependência dentro do bloco é sequencial
 * (ordem de cadastro); dependência cruzada entre blocos usa as setas manuais
 * que já existem (ficam por cima, ver `layoutGraph`).
 */
function roadmapLayout(
  pdi: PdiDoc,
  groups: PdiGroup[],
  rootSize?: { w: number; h: number },
  savedRoot?: { x: number; y: number },
) {
  const labelW = 200;
  const gap = 60;
  const padY = 20;
  const laneH = NODE_SIZE.area.height + padY * 2 + 10;
  const { root, areaNodes } = baseNodes(pdi, "LR", rootSize, true);
  const areaById = new Map(areaNodes.map((n) => [n.id, n]));

  const areaToGroup = groupOfArea(groups);
  const NO_GROUP = "__none";
  const lanesMap = new Map<string, Area[]>();
  for (const area of pdi.areas) {
    const gid = areaToGroup.get(area.id) ?? NO_GROUP;
    if (!lanesMap.has(gid)) lanesMap.set(gid, []);
    lanesMap.get(gid)!.push(area);
  }
  for (const list of lanesMap.values()) list.sort((a, b) => a.order - b.order);

  const lanes = [
    ...[...groups].sort((a, b) => a.order - b.order).map((g) => ({ id: g.id, title: g.title, color: g.color })),
    ...(lanesMap.has(NO_GROUP) ? [{ id: NO_GROUP, title: "Sem bloco", color: brand.gray }] : []),
  ].filter((l) => (lanesMap.get(l.id) ?? []).length > 0);

  const rootW = rootSize?.w ?? NODE_SIZE.root.width;
  const nodes: PdiNode[] = [
    { ...root, position: savedRoot ?? { x: -rootW - 40, y: 0 } },
  ];
  const edges: Edge[] = [];

  lanes.forEach(({ id: gid, title, color }, i) => {
    const areas = lanesMap.get(gid) ?? [];
    const y0 = i * (laneH + 16);
    const avgProgress = areas.reduce((s, a) => s + areaProgress(a), 0) / areas.length;
    const laneW = labelW + areas.length * (NODE_SIZE.area.width + gap) + 40;
    nodes.push({
      id: `lane-${gid}`,
      type: "band",
      position: { x: 0, y: y0 },
      draggable: false,
      selectable: false,
      zIndex: -1,
      data: {
        label: title,
        sub: `${Math.round(avgProgress * 100)}%`,
        accent: color,
        variant: "lane",
        width: laneW,
        height: laneH,
      },
    });

    areas.forEach((area, j) => {
      const n = areaById.get(area.id);
      if (!n) return;
      nodes.push({
        ...n,
        position: { x: labelW + j * (NODE_SIZE.area.width + gap), y: y0 + padY },
        data: { ...n.data, variant: "roadmap" },
      });
      const prev = areas[j - 1];
      edges.push(
        prev
          ? structuralEdge(prev.id, area.id, prev.status)
          : structuralEdge(ROOT_ID, area.id, area.status),
      );
    });
  });

  return { nodes, edges };
}

// ---------------------------------------------------------------------------

/** Monta nós + arestas para o layout escolhido. Links manuais ficam por cima. */
export function layoutGraph(
  pdi: PdiDoc,
  opts: {
    layout?: Layout;
    links?: PdiLink[];
    groups?: PdiGroup[];
    positions?: Record<string, { x: number; y: number }>;
    frameBoxes?: Record<string, FrameBox>;
    /** Tamanho do card raiz redimensionado pelo usuário (arraste no canto, como o bloco). */
    rootSize?: { w: number; h: number };
    shapes?: PdiShape[];
    /** Modo macro: esconde os cards de ação (ficam só na gaveta de detalhe da área). Ignorado no Kanban. */
    hideActions?: boolean;
  } = {},
): { nodes: PdiNode[]; edges: Edge[] } {
  const layout = opts.layout ?? "tree-lr";
  const groups = opts.groups ?? [];
  const positions = opts.positions ?? {};
  const frameBoxes = opts.frameBoxes ?? {};
  const rootSize = opts.rootSize;
  const hideActions = Boolean(opts.hideActions) && layout !== "kanban";
  // Cada formato tem seu próprio sistema de coordenadas — uma chave de
  // posição do raiz por formato evita que o arraste em um "vaze" pro outro.
  const rootKey = `root@${layout}`;
  const savedRoot = positions[rootKey];

  let result: { nodes: PdiNode[]; edges: Edge[] };
  if (layout === "kanban") result = kanbanLayout(pdi, rootSize, savedRoot);
  else if (layout === "swimlane") result = swimlaneLayout(pdi, rootSize, hideActions, savedRoot);
  else if (layout === "radial") result = radialLayout(pdi, rootSize, hideActions, savedRoot);
  else if (layout === "roadmap") result = roadmapLayout(pdi, groups, rootSize, savedRoot);
  else result = treeLayout(pdi, dirFor(layout), groups, positions, frameBoxes, rootSize, hideActions, savedRoot);

  // Anotações entram DEPOIS do layout específico — não participam de nenhum
  // auto-layout/hug, são 100% posicionadas pelo usuário em todos os formatos.
  const nodes = [...result.nodes, ...shapeNodes(opts.shapes ?? [])];

  const linkEdges = (opts.links ?? pdi.links ?? []).map(linkEdge);
  return { nodes, edges: [...result.edges, ...linkEdges] };
}
