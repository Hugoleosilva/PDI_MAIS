"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { brand } from "@/lib/theme";

/** Conexão manual estilo n8n: curva verde-água, seta, "×" para remover ao selecionar. */
export function LinkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const label = (data as { label?: string } | undefined)?.label;
  const onRemove = (data as { onRemove?: (id: string) => void } | undefined)?.onRemove;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: brand.teal, strokeWidth: selected ? 3 : 2 }}
      />
      {(selected || label) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan flex items-center gap-1"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            {label && (
              <span
                className="rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium shadow-sm"
                style={{ borderColor: brand.border, color: brand.ink }}
              >
                {label}
              </span>
            )}
            {selected && (
              <button
                type="button"
                title="Remover conexão"
                onClick={() => onRemove?.(id)}
                className="flex h-5 w-5 items-center justify-center rounded-full border bg-white text-xs leading-none shadow-sm hover:bg-neutral-100"
                style={{ borderColor: brand.border, color: brand.muted }}
              >
                ×
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { link: LinkEdge };
