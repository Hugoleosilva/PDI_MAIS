"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACTION_KIND_LABEL,
  ACTION_STATUS_LABEL,
  type ActionKind,
  type Status,
  type SyncPayloadInput,
} from "@pdi-mais/core";

export interface DraftAction {
  title: string;
  description: string;
  kind: ActionKind;
  dueDate: string;
  status: Status;
}
export interface DraftArea {
  title: string;
  description: string;
  actions: DraftAction[];
}

const KINDS = Object.entries(ACTION_KIND_LABEL) as [ActionKind, string][];
const STATUSES = Object.entries(ACTION_STATUS_LABEL) as [Status, string][];

const emptyAction = (): DraftAction => ({
  title: "",
  description: "",
  kind: "treinamento_estudo",
  dueDate: "",
  status: "todo",
});
const emptyArea = (): DraftArea => ({ title: "", description: "", actions: [emptyAction()] });

const inputCls =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500";
const labelCls = "mb-1 block text-[11px] font-medium text-neutral-500";

export function ManualBuilder({
  title: initialTitle,
  track: initialTrack,
  initialAreas,
  hasExisting,
}: {
  title: string;
  track: string;
  initialAreas: DraftArea[];
  hasExisting: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [track, setTrack] = useState(initialTrack);
  const [areas, setAreas] = useState<DraftArea[]>(
    initialAreas.length ? initialAreas : [emptyArea()],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchArea = (ai: number, patch: Partial<DraftArea>) =>
    setAreas((a) => a.map((x, i) => (i === ai ? { ...x, ...patch } : x)));
  const patchAction = (ai: number, ci: number, patch: Partial<DraftAction>) =>
    setAreas((a) =>
      a.map((x, i) =>
        i === ai
          ? { ...x, actions: x.actions.map((y, j) => (j === ci ? { ...y, ...patch } : y)) }
          : x,
      ),
    );

  const actionCount = areas.reduce(
    (n, a) => n + a.actions.filter((x) => x.title.trim()).length,
    0,
  );
  const validAreas = areas.filter((a) => a.title.trim() && a.actions.some((x) => x.title.trim()));

  const save = async () => {
    if (!title.trim() || validAreas.length === 0) return;
    setBusy(true);
    setError(null);

    const payload: SyncPayloadInput = {
      root: { title: title.trim(), track: track.trim() || undefined },
      areas: validAreas.map((a) => ({
        title: a.title.trim(),
        kind: "Desenvolver",
        description: a.description.trim() || undefined,
        actions: a.actions
          .filter((x) => x.title.trim())
          .map((x) => ({
            title: x.title.trim(),
            kind: x.kind,
            description: x.description.trim() || undefined,
            dueDate: x.dueDate || undefined,
            status: x.status,
          })),
      })),
    };

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `Erro ${res.status}`);
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Nome do ciclo *</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Trilha / tema</label>
          <input
            className={inputCls}
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            placeholder="Desenvolvimento Fullstack"
          />
        </div>
      </div>

      {areas.map((area, ai) => (
        <div key={ai} className="rounded-lg border border-neutral-200 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <label className={labelCls}>Área de desenvolvimento {ai + 1} *</label>
              <input
                className={inputCls}
                value={area.title}
                onChange={(e) => patchArea(ai, { title: e.target.value })}
                placeholder="Ex.: Tecnologias de Backend"
              />
            </div>
            <button
              type="button"
              onClick={() => setAreas((a) => a.filter((_, i) => i !== ai))}
              className="mt-5 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              title="Remover área"
            >
              ✕
            </button>
          </div>

          <div className="mt-2">
            <label className={labelCls}>Descrição da área</label>
            <textarea
              className={`${inputCls} h-16`}
              value={area.description}
              onChange={(e) => patchArea(ai, { description: e.target.value })}
              placeholder="Por que essa área importa / o que você quer desenvolver"
            />
          </div>

          <div className="mt-3 space-y-3">
            {area.actions.map((ac, ci) => (
              <div key={ci} className="rounded-md bg-neutral-50 p-2.5">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>Ação {ci + 1}</label>
                    <input
                      className={inputCls}
                      value={ac.title}
                      onChange={(e) => patchAction(ai, ci, { title: e.target.value })}
                      placeholder="Ex.: Udemy: Node.js do Zero a Maestria"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patchArea(ai, { actions: area.actions.filter((_, j) => j !== ci) })
                    }
                    className="mt-5 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    title="Remover ação"
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  className={`${inputCls} mt-2 h-14`}
                  value={ac.description}
                  onChange={(e) => patchAction(ai, ci, { description: e.target.value })}
                  placeholder="Descrição da ação (objetivo, entregas...)"
                />

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>Tipo</label>
                    <select
                      className={inputCls}
                      value={ac.kind}
                      onChange={(e) => patchAction(ai, ci, { kind: e.target.value as ActionKind })}
                    >
                      {KINDS.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Prazo</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={ac.dueDate}
                      onChange={(e) => patchAction(ai, ci, { dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      className={inputCls}
                      value={ac.status}
                      onChange={(e) => patchAction(ai, ci, { status: e.target.value as Status })}
                    >
                      {STATUSES.map(([s, l]) => (
                        <option key={s} value={s}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patchArea(ai, { actions: [...area.actions, emptyAction()] })}
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              + Ação
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setAreas((a) => [...a, emptyArea()])}
        className="rounded-md border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
      >
        + Área de desenvolvimento
      </button>

      <div className="flex items-center gap-3 border-t border-neutral-200 pt-4">
        <button
          type="button"
          disabled={busy || !title.trim() || validAreas.length === 0}
          onClick={save}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Salvando…" : hasExisting ? "Salvar (atualiza o PDI)" : "Salvar PDI"}
        </button>
        <span className="text-xs text-neutral-500">
          {validAreas.length} áreas · {actionCount} ações
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
