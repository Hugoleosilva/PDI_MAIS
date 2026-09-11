"use client";

import { useState } from "react";
import { formatPercent, snapshotDelta, type PdiDoc, type ProgressSnapshot } from "@pdi-mais/core";

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) {
    return <span className="text-[11px] text-neutral-400">primeiro relatório</span>;
  }
  if (delta === 0) {
    return <span className="text-[11px] text-neutral-400">sem mudança</span>;
  }
  const up = delta > 0;
  return (
    <span className={`text-[11px] font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? "↑" : "↓"} {Math.abs(delta).toLocaleString("pt-BR")} p.p. desde o anterior
    </span>
  );
}

/** Botão + histórico de relatórios de andamento (fotografias com data, pra ver se evoluiu). */
export function ReportButton({ pdi }: { pdi: PdiDoc }) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<ProgressSnapshot[]>(pdi.reports ?? []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setError(false);
    try {
      const res = await fetch("/api/pdi/reports", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setReports((rs) => [...rs, data.snapshot]);
        setExpandedId(data.snapshot.id);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setGenerating(false);
    }
  };

  // pareia cada relatório com a diferença em relação ao anterior (cronológico),
  // depois inverte só pra exibir do mais recente pro mais antigo.
  const rows = reports
    .map((snapshot, i) => ({ snapshot, delta: snapshotDelta(reports[i - 1], snapshot) }))
    .reverse();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
      >
        📊 Relatório
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Relatório de andamento</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-lg leading-none text-neutral-500 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Cada relatório é uma fotografia do andamento na data em que foi gerado — compare
              um com o outro pra ver se evoluiu.
            </p>

            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {generating ? "Gerando…" : "+ Gerar relatório de agora"}
            </button>
            {error && (
              <p className="text-xs text-red-600">Não consegui gerar agora. Tenta de novo.</p>
            )}

            <div className="flex flex-col gap-2 overflow-y-auto">
              {rows.length === 0 && (
                <p className="text-xs text-neutral-400">
                  Nenhum relatório ainda — gere o primeiro pra começar a acompanhar a evolução.
                </p>
              )}
              {rows.map(({ snapshot, delta }) => {
                const isOpen = expandedId === snapshot.id;
                return (
                  <div
                    key={snapshot.id}
                    className="rounded-md border border-neutral-200"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : snapshot.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-neutral-800">
                          {formatDateTime(snapshot.generatedAt)}
                        </span>
                        <DeltaBadge delta={delta} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">
                          {formatPercent(snapshot.overall)}
                        </span>
                        <span className="text-neutral-400">{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="flex flex-col gap-1 border-t border-neutral-100 px-3 py-2">
                        {snapshot.areas.map((a) => (
                          <div key={a.id} className="flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] text-neutral-600">{a.title}</span>
                            <span className="shrink-0 text-[11px] font-medium text-neutral-800">
                              {formatPercent(a.progress)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
