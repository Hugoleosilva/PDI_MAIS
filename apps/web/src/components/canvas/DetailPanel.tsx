"use client";

import {
  ACTION_KIND_LABEL,
  formatPercent,
  type ActionKind,
  type Status,
} from "@pdi-mais/core";
import type { PdiNode } from "@/lib/pdi-to-graph";
import { brand, statusStyle } from "@/lib/theme";
import { formatDate } from "@/lib/format";

interface PanelData {
  title: string;
  status: Status;
  description?: string;
  dueDate?: string;
  kind?: ActionKind;
  progress?: number;
  actionCount?: number;
}

export function DetailPanel({ node, onClose }: { node: PdiNode; onClose: () => void }) {
  const isArea = node.type === "area";
  const d = node.data as PanelData;
  const s = statusStyle(d.status, isArea ? "area" : "action");

  return (
    <aside
      className="absolute right-0 top-0 z-10 flex h-full w-[340px] flex-col gap-4 border-l bg-white p-5 shadow-xl"
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ background: s.badgeBg, color: s.badgeText }}>
          {s.label}
        </span>
        {!isArea && d.dueDate ? (
          <span className="text-xs" style={{ color: brand.muted }}>Prazo: {formatDate(d.dueDate)}</span>
        ) : null}
      </div>

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
        <div className="text-xs" style={{ color: brand.muted }}>
          {d.kind ? ACTION_KIND_LABEL[d.kind] : ""}
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
