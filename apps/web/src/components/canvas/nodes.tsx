"use client";

import { useEffect, useRef, useState } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { formatPercent } from "@pdi-mais/core";
import type {
  ActionNodeData,
  AreaNodeData,
  BandNodeData,
  Direction,
  GroupNodeData,
  RootNodeData,
} from "@/lib/pdi-to-graph";
import { NODE_SIZE } from "@/lib/pdi-to-graph";
import { brand, statusStyle } from "@/lib/theme";
import { formatDate } from "@/lib/format";

const handleStyle = { width: 6, height: 6, background: brand.border, border: "none" };

const targetPos = (dir: Direction) => (dir === "LR" ? Position.Left : Position.Top);
const sourcePos = (dir: Direction) => (dir === "LR" ? Position.Right : Position.Bottom);

/**
 * Borda 100% em propriedades por lado — sem nenhum atalho (`border`,
 * `borderColor`, `borderWidth`...) — pra não disparar o warning do React
 * ao alternar a cor quando `selected` muda.
 */
function borderStyle(accent: string, selected?: boolean): React.CSSProperties {
  const c = selected ? accent : brand.border;
  return {
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 4,
    borderTopColor: c,
    borderRightColor: c,
    borderBottomColor: c,
    borderLeftColor: accent,
    boxShadow: selected ? `0 0 0 2px ${accent}55` : undefined,
  };
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: brand.graySoft }}>
      <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}

/** Texto que vira input ao dar duplo clique. Sem `onCommit` = só leitura. */
function EditableText({
  value,
  placeholder,
  onCommit,
  className,
  style,
}: {
  value: string;
  placeholder: string;
  onCommit?: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const v = draft.trim();
          if (v && v !== value) onCommit?.(v);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className={`nodrag nopan w-full rounded border-b bg-transparent outline-none ${className ?? ""}`}
        style={style}
      />
    );
  }

  return (
    <span
      className={`${onCommit ? "cursor-text rounded px-0.5 hover:bg-black/5" : ""} ${className ?? ""}`}
      style={style}
      title={onCommit ? "Duplo clique para editar" : undefined}
      onDoubleClick={
        onCommit
          ? (e) => {
              e.stopPropagation();
              setEditing(true);
            }
          : undefined
      }
    >
      {value || placeholder}
    </span>
  );
}

export function RootNode({ data }: NodeProps & { data: RootNodeData }) {
  return (
    <div
      className="flex flex-col justify-center gap-2 rounded-xl bg-white p-4 shadow-md"
      style={{
        width: NODE_SIZE.root.width,
        height: NODE_SIZE.root.height,
        background: "#F6F9FF",
        ...borderStyle(brand.blue),
        borderLeftWidth: 6,
      }}
    >
      <span
        className="w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold"
        style={{ background: brand.blueSoft, color: brand.blue }}
      >
        PDI
      </span>
      <EditableText
        value={data.title}
        placeholder="PDI"
        onCommit={data.onEditTitle}
        className="text-base font-bold leading-tight"
        style={{ color: brand.ink }}
      />
      <EditableText
        value={data.track ?? ""}
        placeholder="+ trilha / tema"
        onCommit={data.onEditTrack}
        className="text-xs font-medium"
        style={{ color: brand.muted }}
      />
      <div className="flex items-center gap-2">
        <Bar value={data.progress} color={brand.blue} />
        <span className="shrink-0 text-xs font-bold" style={{ color: brand.ink }}>{formatPercent(data.progress)}</span>
      </div>
      <div className="text-[11px]" style={{ color: brand.muted }}>{data.areaCount} áreas de desenvolvimento</div>
      <Handle type="target" position={targetPos(data.dir)} style={handleStyle} />
      <Handle type="source" position={sourcePos(data.dir)} style={handleStyle} />
    </div>
  );
}

export function AreaNode({ data, selected }: NodeProps & { data: AreaNodeData }) {
  const s = statusStyle(data.status, "area");
  return (
    <div
      className="flex cursor-pointer flex-col gap-1.5 rounded-xl bg-white p-3 shadow-sm"
      style={{ width: NODE_SIZE.area.width, height: NODE_SIZE.area.height, ...borderStyle(s.accent, selected) }}
    >
      <div className="flex items-center gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: s.badgeBg, color: s.badgeText }}>
          {s.label}
        </span>
        {data.hasNotStarted && <span title="Tem ação não iniciada" aria-hidden>🕒</span>}
      </div>
      <div className="line-clamp-2 text-[13px] font-semibold leading-snug" style={{ color: brand.ink }}>
        {data.title}
      </div>
      <div className="mt-auto flex items-center gap-2">
        <Bar value={data.progress} color={s.accent} />
        <span className="shrink-0 text-[11px] font-semibold" style={{ color: brand.ink }}>{formatPercent(data.progress)}</span>
        <span className="shrink-0 text-[11px]" style={{ color: brand.muted }}>· {data.actionCount}</span>
      </div>
      <Handle type="target" position={targetPos(data.dir)} style={handleStyle} />
      <Handle type="source" position={sourcePos(data.dir)} style={handleStyle} />
    </div>
  );
}

export function ActionNode({ data, selected }: NodeProps & { data: ActionNodeData }) {
  const s = statusStyle(data.status, "action");
  return (
    <div
      className="flex cursor-pointer flex-col gap-1.5 rounded-xl bg-white p-3 shadow-sm"
      style={{ width: NODE_SIZE.action.width, height: NODE_SIZE.action.height, ...borderStyle(s.accent, selected) }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: s.badgeBg, color: s.badgeText }}>
          {s.label}
        </span>
        {data.dueDate && (
          <span className="text-[11px]" style={{ color: brand.muted }}>Prazo: {formatDate(data.dueDate)}</span>
        )}
      </div>
      <div className="line-clamp-2 text-[13px] font-semibold leading-snug" style={{ color: brand.ink }}>
        {data.title}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="truncate text-[11px]" style={{ color: brand.muted }} title={data.areaTitle}>
          {data.areaTitle}
        </span>
        {data.description && (
          <span className="shrink-0 text-[11px] font-medium" style={{ color: brand.orange }}>descrição ↗</span>
        )}
      </div>
      <Handle type="target" position={targetPos(data.dir)} style={handleStyle} />
      <Handle type="source" position={sourcePos(data.dir)} style={handleStyle} />
    </div>
  );
}

/** Cabeçalho de coluna (Kanban) ou faixa de fundo (Raias). */
export function BandNode({ data }: NodeProps & { data: BandNodeData }) {
  if (data.variant === "lane") {
    return (
      <div
        className="flex items-start rounded-xl"
        style={{
          width: data.width,
          height: data.height,
          background: `${data.accent}0F`,
          borderLeftWidth: 4,
          borderLeftStyle: "solid",
          borderLeftColor: data.accent,
        }}
      >
        <div className="max-w-[190px] p-3">
          <div className="line-clamp-2 text-[13px] font-semibold" style={{ color: brand.ink }}>
            {data.label}
          </div>
          {data.sub && (
            <div className="text-[11px]" style={{ color: brand.muted }}>{data.sub} concluído</div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3"
      style={{ width: data.width, height: data.height, background: `${data.accent}1A` }}
    >
      <span className="text-[13px] font-bold" style={{ color: data.accent }}>{data.label}</span>
      {data.sub && (
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: "white", color: brand.muted }}
        >
          {data.sub}
        </span>
      )}
    </div>
  );
}

/**
 * Frame de agrupamento (bloco estratégico), atrás dos cards.
 * Corpo "clique-através" (deixa o pan passar); a barra de título move o frame
 * e as alças redimensionam. Quem cair dentro do frame entra no bloco.
 */
export function GroupNode({ data }: NodeProps & { data: GroupNodeData }) {
  const selected = data.isSelected;
  return (
    <>
      <NodeResizer
        color={data.color}
        isVisible={selected}
        minWidth={300}
        minHeight={200}
        handleStyle={{
          pointerEvents: "all",
          width: 16,
          height: 16,
          borderRadius: 4,
          border: "2px solid white",
          background: data.color,
        }}
        lineStyle={{ pointerEvents: "all", borderWidth: 12, opacity: 0 }}
        onResizeEnd={(_, p) => data.onResize?.({ x: p.x, y: p.y, w: p.width, h: p.height })}
      />
      <div
        className="h-full w-full cursor-move overflow-hidden rounded-2xl"
        style={{
          borderWidth: selected ? 3 : 2,
          borderStyle: selected ? "solid" : "dashed",
          borderColor: data.color,
          background: selected ? `${data.color}22` : `${data.color}12`,
          boxShadow: selected ? `0 0 0 4px ${data.color}33` : undefined,
        }}
      >
        <Handle type="target" position={Position.Left} style={{ ...handleStyle, opacity: 0 }} />
        <div
          className="flex w-full items-center gap-2 px-3 py-2"
          style={{ background: data.color }}
        >
          <button
            type="button"
            title="Trocar a cor do bloco"
            onClick={(e) => {
              e.stopPropagation();
              data.onRecolor?.();
            }}
            className="nodrag nopan h-3.5 w-3.5 shrink-0 rounded-full border border-white/70 bg-white/30"
          />
          <EditableText
            value={data.title}
            placeholder="Bloco"
            onCommit={data.onRename}
            className="flex-1 text-[13px] font-bold text-white"
          />
          {data.empty && (
            <span className="shrink-0 text-[11px] font-normal text-white/80">
              solte cards aqui
            </span>
          )}
          {selected && (
            <span className="shrink-0 text-[11px] font-medium text-white/80">
              arraste p/ mover tudo
            </span>
          )}
        </div>
      </div>

      <StickyNote note={data.note} color={data.color} onCommit={data.onEditNote} show={selected} />
    </>
  );
}

/** Nota amarela ao lado do bloco (canto superior esquerdo, fora do frame). */
function StickyNote({
  note,
  color,
  onCommit,
  show,
}: {
  note?: string;
  color: string;
  onCommit?: (v: string) => void;
  show: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setDraft(note ?? ""), [note]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const hasNote = Boolean(note && note.trim());
  if (!hasNote && !show && !editing) return null;

  return (
    <div
      className="nodrag nopan absolute w-[210px]"
      style={{ right: "calc(100% + 12px)", top: 0, pointerEvents: "auto" }}
    >
      <div
        className="rounded-lg p-2 text-[11px] leading-snug shadow-sm"
        style={{ background: "#FEF3C7", borderLeft: `3px solid ${color}` }}
      >
        <div className="mb-1 font-semibold" style={{ color: brand.muted }}>
          Anotação
        </div>
        {editing ? (
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              const v = draft.trim();
              if (v !== (note ?? "").trim()) onCommit?.(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(note ?? "");
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-24 w-full resize-none rounded border-none bg-white/70 p-1 text-[11px] outline-none"
            placeholder="Resumo das ações, lembrete…"
          />
        ) : (
          <p
            className="min-h-[16px] cursor-text whitespace-pre-wrap"
            style={{ color: brand.ink }}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            title="Clique para editar"
          >
            {hasNote ? note : <span style={{ color: brand.muted }}>+ anotação</span>}
          </p>
        )}
      </div>
    </div>
  );
}

export const nodeTypes = {
  root: RootNode,
  area: AreaNode,
  action: ActionNode,
  band: BandNode,
  group: GroupNode,
};
