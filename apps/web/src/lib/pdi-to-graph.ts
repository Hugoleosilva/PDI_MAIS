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

export const NODE_SIZE = {
  root: { width: 260, height: 132 },
  area: { width: 288, height: 108 },
  action: { width: 344, height: 132 },
} as const;

export interface RootNodeData extends Record<string, unknown> {
  title: string;
  track?: string;
  progress: number;
  areaCount: number;
}

export interface AreaNodeData extends Record<string, unknown> {
  title: string;
  status: Status;
  progress: number;
  actionCount: number;
  hasNotStarted: boolean;
  description?: string;
}

export interface ActionNodeData extends Record<string, unknown> {
  title: string;
  status: Status;
  dueDate?: string;
  kind: ActionKind;
  description?: string;
}

export type PdiNode =
  | Node<RootNodeData, "root">
  | Node<AreaNodeData, "area">
  | Node<ActionNodeData, "action">;

const ROOT_ID = "root";

/** Monta os nós e arestas (sem posição) a partir do documento. */
function buildGraph(pdi: PdiDoc): { nodes: PdiNode[]; edges: Edge[] } {
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

/** Layout da esquerda para a direita com o Dagre. */
export function layoutGraph(pdi: PdiDoc): { nodes: PdiNode[]; edges: Edge[] } {
  const { nodes, edges } = buildGraph(pdi);

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 18, ranksep: 110, marginx: 24, marginy: 24 });

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
