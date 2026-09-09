import Dagre from "@dagrejs/dagre";
import {
  areaProgress,
  hasNotStarted,
  overallProgress,
  type ActionKind,
  type PdiDoc,
  type Status,
} from "@pdi-mais/core";
import type { Edge, Node } from "@xyflow/react";

/** Direção do layout: LR = esquerda→direita, TB = cima→baixo. */
export type Direction = "LR" | "TB";

export const NODE_SIZE = {
  root: { width: 250, height: 168 },
  area: { width: 264, height: 96 },
  action: { width: 320, height: 112 },
} as const;

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
  dir: Direction;
}

export type PdiNode =
  | Node<RootNodeData, "root">
  | Node<AreaNodeData, "area">
  | Node<ActionNodeData, "action">;

const ROOT_ID = "root";

function buildGraph(pdi: PdiDoc, dir: Direction): { nodes: PdiNode[]; edges: Edge[] } {
  const nodes: PdiNode[] = [
    {
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
    },
  ];
  const edges: Edge[] = [];

  for (const area of pdi.areas) {
    nodes.push({
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
    });
    edges.push(edge(ROOT_ID, area.id, area.status));

    for (const action of area.actions) {
      nodes.push({
        id: action.id,
        type: "action",
        position: { x: 0, y: 0 },
        data: {
          title: action.title,
          status: action.status,
          dueDate: action.dueDate,
          kind: action.kind,
          description: action.description,
          dir,
        },
      });
      edges.push(edge(area.id, action.id, action.status));
    }
  }

  return { nodes, edges };
}

function edge(source: string, target: string, status: Status): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: "smoothstep",
    animated: status === "doing",
    style: {
      strokeWidth: status === "todo" ? 1 : 1.75,
      opacity: status === "todo" ? 0.4 : 1,
    },
  };
}

/** Layout com o Dagre na direção pedida. */
export function layoutGraph(
  pdi: PdiDoc,
  opts: { direction?: Direction } = {},
): { nodes: PdiNode[]; edges: Edge[] } {
  const dir = opts.direction ?? "LR";
  const { nodes, edges } = buildGraph(pdi, dir);

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: dir,
    nodesep: dir === "LR" ? 16 : 26,
    ranksep: dir === "LR" ? 84 : 64,
    marginx: 24,
    marginy: 24,
  });

  for (const node of nodes) {
    const size = NODE_SIZE[node.type];
    g.setNode(node.id, { width: size.width, height: size.height });
  }
  for (const e of edges) g.setEdge(e.source, e.target);

  Dagre.layout(g);

  const positioned = nodes.map((node) => {
    const { x, y } = g.node(node.id);
    const size = NODE_SIZE[node.type];
    return {
      ...node,
      // Dagre devolve o centro; o React Flow usa o canto superior esquerdo.
      position: { x: x - size.width / 2, y: y - size.height / 2 },
    };
  });

  return { nodes: positioned as PdiNode[], edges };
}
