"use client";

import { useEffect, useRef, useState } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { formatPercent, GROUP_COLORS, NOTE_COLORS } from "@pdi-mais/core";
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

/** Popover de swatches + cor personalizada. Fecha ao escolher ou clicar fora. */
function ColorPicker({
  value,
  options,
  onPick,
  onClose,
}: {
  value: string;
  options: readonly string[];
  onPick: (c: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="nodrag nopan absolute z-10 flex flex-wrap gap-1.5 rounded-lg border bg-white p-2 shadow-md"
      style={{ borderColor: brand.border, top: "calc(100% + 6px)", left: 0, width: 128 }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {options.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => {
            onPick(c);
            onClose();
          }}
          className="h-5 w-5 shrink-0 rounded-full"
          style={{
            background: c,
            borderWidth: c.toLowerCase() === value.toLowerCase() ? 2 : 1,
            borderStyle: "solid",
            borderColor: c.toLowerCase() === value.toLowerCase() ? brand.ink : "rgba(0,0,0,.15)",
          }}
        />
      ))}
      <label
        className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-[11px] leading-none"
        style={{ borderWidth: 1, borderStyle: "dashed", borderColor: brand.border, color: brand.muted }}
        title="Cor personalizada"
      >
        +
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#888888"}
          onChange={(e) => onPick(e.target.value)}
          className="sr-only"
        />
      </label>
    </div>
  );
}

export function RootNode({ data, selected }: NodeProps & { data: RootNodeData }) {
  const width = data.width ?? NODE_SIZE.root.width;
  const height = data.height ?? NODE_SIZE.root.height;
  return (
    <>
      {/* Redimensionável como o bloco — arraste um canto pra dar mais espaço ao PDI. */}
      <NodeResizer
        color={brand.blue}
        isVisible={selected}
        minWidth={220}
        minHeight={150}
        maxWidth={420}
        maxHeight={300}
        handleStyle={{
          pointerEvents: "all",
          width: 14,
          height: 14,
          borderRadius: 4,
          border: "2px solid white",
          background: brand.blue,
        }}
        lineStyle={{ pointerEvents: "all", borderWidth: 10, opacity: 0 }}
        onResizeEnd={(_, p) => data.onResize?.({ w: p.width, h: p.height })}
      />
      <div
        className="flex h-full w-full flex-col justify-center gap-2 rounded-xl bg-white p-4 shadow-md"
        style={{
          width,
          height,
          background: "#F6F9FF",
          ...borderStyle(brand.blue, selected),
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
      <RootNote note={data.note} onCommit={data.onEditNote} show={Boolean(selected)} />
    </>
  );
}

/**
 * Objetivo geral do PDI ("pra onde estou indo"), acima do card raiz — mesmo
 * padrão do bloco: popover, só existe selecionado (ou editando); clicar fora
 * desseleciona e ele some.
 */
function RootNote({
  note,
  onCommit,
  show,
}: {
  note?: string;
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

  if (!show && !editing) return null;
  const hasNote = Boolean(note && note.trim());
  const placeholder = 'Descrição do objetivo ("Para onde estou indo")';

  return (
    <div
      className="nodrag nopan absolute w-[260px]"
      style={{ bottom: "calc(100% + 12px)", left: 0, pointerEvents: "auto" }}
    >
      <div
        className="rounded-lg p-2 text-[11px] leading-snug shadow-sm"
        style={{ background: "#FEF3C7", borderLeft: `3px solid ${brand.blue}` }}
      >
        <div className="mb-1 font-semibold" style={{ color: brand.muted }}>
          Objetivo
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
            className="min-h-[64px] w-full resize-y rounded border-none bg-white/70 p-1 text-[11px] outline-none"
            placeholder={placeholder}
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
            {hasNote ? note : <span style={{ color: brand.muted }}>{placeholder}</span>}
          </p>
        )}
      </div>
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
        <div className="flex shrink-0 items-center gap-2">
          {data.certificateUrl && (
            <a
              href={data.certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Abrir certificado / comprovante"
              className="nodrag text-[11px] font-medium"
              style={{ color: brand.teal }}
            >
              🎓 certificado ↗
            </a>
          )}
          {data.description && (
            <span className="text-[11px] font-medium" style={{ color: brand.orange }}>descrição ↗</span>
          )}
        </div>
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
  const [colorOpen, setColorOpen] = useState(false);
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
          <div className="relative shrink-0">
            <button
              type="button"
              title="Trocar a cor do bloco"
              onClick={(e) => {
                e.stopPropagation();
                setColorOpen((v) => !v);
              }}
              className="nodrag nopan h-3.5 w-3.5 rounded-full border border-white/70 bg-white/30"
            />
            {colorOpen && (
              <ColorPicker
                value={data.color}
                options={GROUP_COLORS}
                onPick={(c) => data.onRecolor?.(c)}
                onClose={() => setColorOpen(false)}
              />
            )}
          </div>
          <EditableText
            value={data.title}
            placeholder="Bloco"
            onCommit={data.onRename}
            className="flex-1 text-[13px] font-bold text-white"
          />
          {data.progress != null && (
            <span
              title="Andamento médio das áreas de dentro"
              className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold text-white"
            >
              {formatPercent(data.progress)}
            </span>
          )}
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

      <StickyNote
        note={data.note}
        color={data.color}
        noteColor={data.noteColor}
        onCommit={data.onEditNote}
        onNoteColor={data.onNoteColor}
        actionStats={data.actionStats}
        show={selected}
      />
    </>
  );
}

function StatPill({ label, n, accent }: { label: string; n: number; accent: string }) {
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: `${accent}22`, color: accent }}
    >
      {n} {label}
    </span>
  );
}

/**
 * Cartãozinho ao lado do bloco (canto superior esquerdo, fora do frame):
 * quantitativo de ações + anotação. É um popover — só existe enquanto o
 * bloco está selecionado (ou você está editando a anotação); clicar fora
 * desseleciona o bloco e ele some.
 */
function StickyNote({
  note,
  color,
  noteColor,
  onCommit,
  onNoteColor,
  actionStats,
  show,
}: {
  note?: string;
  color: string;
  noteColor?: string;
  onCommit?: (v: string) => void;
  onNoteColor?: (c: string) => void;
  actionStats?: { total: number; todo: number; doing: number; done: number };
  show: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [colorOpen, setColorOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setDraft(note ?? ""), [note]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!show && !editing) return null;
  const hasNote = Boolean(note && note.trim());
  const bg = noteColor ?? NOTE_COLORS[0];

  return (
    <div
      className="nodrag nopan absolute w-[240px]"
      style={{ right: "calc(100% + 12px)", top: 0, pointerEvents: "auto" }}
    >
      <div
        className="rounded-lg p-2 text-[11px] leading-snug shadow-sm"
        style={{ background: bg, borderLeft: `3px solid ${color}` }}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-semibold" style={{ color: brand.muted }}>
            Anotação
          </span>
          <div className="relative shrink-0">
            <button
              type="button"
              title="Trocar a cor da nota"
              onClick={(e) => {
                e.stopPropagation();
                setColorOpen((v) => !v);
              }}
              className="h-3 w-3 rounded-full border"
              style={{ background: bg, borderColor: "rgba(0,0,0,.25)" }}
            />
            {colorOpen && (
              <ColorPicker
                value={bg}
                options={NOTE_COLORS}
                onPick={(c) => onNoteColor?.(c)}
                onClose={() => setColorOpen(false)}
              />
            )}
          </div>
        </div>

        {actionStats && actionStats.total > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            <StatPill label="a iniciar" n={actionStats.todo} accent={statusStyle("todo", "action").accent} />
            <StatPill label="em andamento" n={actionStats.doing} accent={statusStyle("doing", "action").accent} />
            <StatPill label="finalizadas" n={actionStats.done} accent={statusStyle("done", "action").accent} />
          </div>
        )}

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
            className="min-h-[64px] w-full resize-y rounded border-none bg-white/70 p-1 text-[11px] outline-none"
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
