"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ACTION_KIND_LABEL, formatPercent } from "@pdi-mais/core";
import type {
  ActionNodeData,
  AreaNodeData,
  RootNodeData,
} from "@/lib/pdi-to-graph";
import { NODE_SIZE } from "@/lib/pdi-to-graph";
import { brand, statusStyle } from "@/lib/theme";
import { formatDate } from "@/lib/format";

const handleStyle = { width: 6, height: 6, background: brand.border, border: "none" };

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: brand.graySoft }}>
      <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}

export function RootNode({ data }: NodeProps & { data: RootNodeData }) {
  return (
    <div
      className="flex flex-col justify-center gap-2 rounded-xl border bg-white p-4 shadow-sm"
      style={{ width: NODE_SIZE.root.width, height: NODE_SIZE.root.height, borderColor: brand.border, borderLeft: `4px solid ${brand.blue}` }}
    >
      <div>
        <div className="text-base font-bold" style={{ color: brand.ink }}>{data.title}</div>
        {data.track && <div className="text-xs" style={{ color: brand.muted }}>{data.track}</div>}
      </div>
      <div className="flex items-center gap-2">
        <Bar value={data.progress} color={brand.blue} />
        <span className="shrink-0 text-xs font-semibold" style={{ color: brand.ink }}>{formatPercent(data.progress)}</span>
      </div>
      <div className="text-[11px]" style={{ color: brand.muted }}>{data.areaCount} áreas de desenvolvimento</div>
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}

export function AreaNode({ data, selected }: NodeProps & { data: AreaNodeData }) {
  const s = statusStyle(data.status, "area");
  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl border bg-white p-3 shadow-sm transition-shadow"
      style={{
        width: NODE_SIZE.area.width,
        height: NODE_SIZE.area.height,
        borderColor: selected ? s.accent : brand.border,
        borderLeft: `4px solid ${s.accent}`,
        boxShadow: selected ? `0 0 0 2px ${s.accent}33` : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: s.badgeBg, color: s.badgeText }}>
          {s.label}
        </span>
        {data.hasNotStarted && <span title="Tem ação não iniciada" aria-hidden>🕒</span>}
      </div>
      <div className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: brand.ink }}>
        {data.title}
      </div>
      <div className="mt-auto flex items-center gap-2">
        <Bar value={data.progress} color={s.accent} />
        <span className="shrink-0 text-[11px] font-semibold" style={{ color: brand.ink }}>{formatPercent(data.progress)}</span>
        <span className="shrink-0 text-[11px]" style={{ color: brand.muted }}>· {data.actionCount} ações</span>
      </div>
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}

export function ActionNode({ data, selected }: NodeProps & { data: ActionNodeData }) {
  const s = statusStyle(data.status, "action");
  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl border bg-white p-3 shadow-sm"
      style={{
        width: NODE_SIZE.action.width,
        height: NODE_SIZE.action.height,
        borderColor: selected ? s.accent : brand.border,
        borderLeft: `4px solid ${s.accent}`,
        boxShadow: selected ? `0 0 0 2px ${s.accent}33` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: s.badgeBg, color: s.badgeText }}>
          {s.label}
        </span>
        {data.dueDate && (
          <span className="text-[11px]" style={{ color: brand.muted }}>Prazo: {formatDate(data.dueDate)}</span>
        )}
      </div>
      <div className="line-clamp-3 text-[13px] font-semibold leading-snug" style={{ color: brand.ink }}>
        {data.title}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-[11px]" style={{ color: brand.muted }}>{ACTION_KIND_LABEL[data.kind]}</span>
        {data.description && (
          <span className="text-[11px] font-medium" style={{ color: brand.orange }}>ver descrição ↗</span>
        )}
      </div>
      <Handle type="target" position={Position.Left} style={handleStyle} />
    </div>
  );
}

export const nodeTypes = { root: RootNode, area: AreaNode, action: ActionNode };
