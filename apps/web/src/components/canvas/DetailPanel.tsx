"use client";

import {
  ACTION_KIND_LABEL,
  ACTION_STATUS_LABEL,
  formatPercent,
  type Action,
  type ActionKind,
  type Status,
} from "@pdi-mais/core";
import type { PdiNode } from "@/lib/pdi-to-graph";
import { brand, statusStyle } from "@/lib/theme";

interface PanelData {
  title: string;
  status: Status;
  description?: string;
  dueDate?: string;
  kind?: ActionKind;
  progress?: number;
  actionCount?: number;
  certificateUrl?: string;
}

const STATUS_ORDER: Status[] = ["todo", "doing", "done"];

type ActionPatch = { status?: Status; dueDate?: string | null };
type EditableAction = Pick<Action, "id" | "status" | "dueDate" | "certificateUrl">;

/** Status + prazo editáveis — reaproveitado na lista de módulos e na ação direta. */
function ActionEditor({
  action,
  onUpdate,
}: {
  action: EditableAction;
  onUpdate?: (id: string, patch: ActionPatch) => void;
}) {
  const s = statusStyle(action.status, "action");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={action.status}
        onChange={(e) => onUpdate?.(action.id, { status: e.target.value as Status })}
        className="rounded border px-1.5 py-0.5 text-[11px] font-medium outline-none"
        style={{ borderColor: brand.border, background: s.badgeBg, color: s.badgeText }}
      >
        {STATUS_ORDER.map((st) => (
          <option key={st} value={st}>
            {ACTION_STATUS_LABEL[st]}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={action.dueDate ?? ""}
        onChange={(e) => onUpdate?.(action.id, { dueDate: e.target.value || null })}
        className="rounded border px-1.5 py-0.5 text-[11px] outline-none"
        style={{ borderColor: brand.border, color: brand.ink }}
      />
      {action.certificateUrl && (
        <a
          href={action.certificateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium"
          style={{ color: brand.teal }}
        >
          Certificado
        </a>
      )}
    </div>
  );
}

/** Linha de módulo — status/prazo editáveis direto na gaveta (modo macro). */
function ModuleRow({
  action,
  onUpdate,
}: {
  action: Action;
  onUpdate?: (id: string, patch: ActionPatch) => void;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border p-2.5"
      style={{ borderColor: brand.border }}
    >
      <span className="text-xs font-medium leading-snug" style={{ color: brand.ink }}>
        {action.title}
      </span>
      <ActionEditor action={action} onUpdate={onUpdate} />
    </div>
  );
}

export function DetailPanel({
  node,
  onClose,
  modules,
  onUpdateAction,
}: {
  node: PdiNode;
  onClose: () => void;
  /** Ações da área (modo macro) — vira "lista de módulos" com status/prazo editáveis. */
  modules?: Action[];
  onUpdateAction?: (id: string, patch: ActionPatch) => void;
}) {
  const isArea = node.type === "area";
  const d = node.data as PanelData;
  const s = statusStyle(d.status, isArea ? "area" : "action");

  return (
    <aside
      className="absolute right-0 top-0 z-10 flex h-full w-[340px] flex-col gap-4 overflow-y-auto border-l bg-white p-5 shadow-xl"
      style={{ borderColor: brand.border }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: brand.muted }}>
          {isArea ? "Área de desenvolvimento" : "Ação"}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded p-1 text-lg leading-none hover:bg-neutral-100"
          style={{ color: brand.muted }}
        >
          ✕
        </button>
      </div>

      {isArea && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ background: s.badgeBg, color: s.badgeText }}>
            {s.label}
          </span>
        </div>
      )}

      <h2 className="text-base font-semibold leading-snug" style={{ color: brand.ink }}>
        {d.title}
      </h2>

      {isArea ? (
        <div className="flex items-center gap-3 text-xs" style={{ color: brand.muted }}>
          <span>{formatPercent(d.progress ?? 0)} concluído</span>
          <span>·</span>
          <span>{d.actionCount ?? 0} ações</span>
        </div>
      ) : (
        <>
          <div className="text-xs" style={{ color: brand.muted }}>
            {d.kind ? ACTION_KIND_LABEL[d.kind] : ""}
          </div>
          <ActionEditor
            action={{ id: node.id, status: d.status, dueDate: d.dueDate, certificateUrl: d.certificateUrl }}
            onUpdate={onUpdateAction}
          />
        </>
      )}

      {isArea && modules && modules.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: brand.muted }}>
            Módulos ({modules.length})
          </div>
          <div className="flex flex-col gap-1.5">
            {modules.map((a) => (
              <ModuleRow key={a.id} action={a} onUpdate={onUpdateAction} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-1">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: brand.muted }}>
          Descrição / comentário
        </div>
        {d.description ? (
          <p
            className="whitespace-pre-wrap rounded-md p-3 text-sm leading-relaxed"
            style={{ background: "#FEF9C3", color: brand.ink }}
          >
            {d.description}
          </p>
        ) : (
          <p className="text-sm italic" style={{ color: brand.muted }}>
            Sem comentário. A edição chega na Rodada 4.
          </p>
        )}
      </div>
    </aside>
  );
}
