import type { Node, NodePositionChange, XYPosition } from "@xyflow/react";

export interface HelperLinesResult {
  horizontal?: number;
  vertical?: number;
  snapPosition: Partial<XYPosition>;
}

function sizeOf(n: Node): { w: number; h: number } {
  return {
    w: n.measured?.width ?? (n.width as number | undefined) ?? 0,
    h: n.measured?.height ?? (n.height as number | undefined) ?? 0,
  };
}

/**
 * Guias de alinhamento estilo FigJam. Compara a borda/centro do nó arrastado
 * com os demais e, se estiver a < `distance` px, devolve a linha e a posição
 * "grudada". Adaptado do exemplo oficial do React Flow.
 */
export function getHelperLines(
  change: NodePositionChange,
  nodes: Node[],
  distance = 5,
): HelperLinesResult {
  const result: HelperLinesResult = { snapPosition: {} };
  const dragged = nodes.find((n) => n.id === change.id);
  if (!dragged || !change.position) return result;

  const a = sizeOf(dragged);
  const A = {
    left: change.position.x,
    right: change.position.x + a.w,
    top: change.position.y,
    bottom: change.position.y + a.h,
    cx: change.position.x + a.w / 2,
    cy: change.position.y + a.h / 2,
    w: a.w,
    h: a.h,
  };

  let vDist = distance;
  let hDist = distance;

  for (const other of nodes) {
    if (other.id === dragged.id) continue;
    const b = sizeOf(other);
    const B = {
      left: other.position.x,
      right: other.position.x + b.w,
      top: other.position.y,
      bottom: other.position.y + b.h,
      cx: other.position.x + b.w / 2,
      cy: other.position.y + b.h / 2,
    };

    const vChecks: [number, number, number][] = [
      // |A.value - B.value|, linha, x resultante do nó A
      [Math.abs(A.left - B.left), B.left, B.left],
      [Math.abs(A.right - B.right), B.right, B.right - A.w],
      [Math.abs(A.left - B.right), B.right, B.right],
      [Math.abs(A.right - B.left), B.left, B.left - A.w],
      [Math.abs(A.cx - B.cx), B.cx, B.cx - A.w / 2],
    ];
    for (const [d, line, x] of vChecks) {
      if (d < vDist) {
        vDist = d;
        result.vertical = line;
        result.snapPosition.x = x;
      }
    }

    const hChecks: [number, number, number][] = [
      [Math.abs(A.top - B.top), B.top, B.top],
      [Math.abs(A.bottom - B.bottom), B.bottom, B.bottom - A.h],
      [Math.abs(A.top - B.bottom), B.bottom, B.bottom],
      [Math.abs(A.bottom - B.top), B.top, B.top - A.h],
      [Math.abs(A.cy - B.cy), B.cy, B.cy - A.h / 2],
    ];
    for (const [d, line, y] of hChecks) {
      if (d < hDist) {
        hDist = d;
        result.horizontal = line;
        result.snapPosition.y = y;
      }
    }
  }

  return result;
}
