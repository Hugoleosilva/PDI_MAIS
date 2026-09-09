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

const field =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900";
const lbl = "mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500";

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
  const validAreas = areas.filter(
    (a) => a.title.trim() && a.actions.some((x) => x.title.trim()),
  );

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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={lbl}>Nome do ciclo *</span>
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className={lbl}>Trilha / tema</span>
          <input
            className={field}
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            placeholder="Desenvolvimento Fullstack"
          />
        </label>
      </div>

      {areas.map((area, ai) => (
        <section key={ai} className="rounded-xl border border-neutral-200 bg-white">
          <header className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
            <span className="text-xs font-semibold text-neutral-400">#{ai + 1}</span>
            <input
              className="flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold text-neutral-900 outline-none placeholder:font-normal placeholder:text-neutral-400"
              value={area.title}
              onChange={(e) => patchArea(ai, { title: e.target.value })}
              placeholder="Área de desenvolvimento"
            />
            <button
              type="button"
              onClick={() => setAreas((a) => a.filter((_, i) => i !== ai))}
              className="shrink-0 rounded px-2 py-1 text-xs font-medium text-neutral-400 hover:bg-red-50 hover:text-red-600"
            >
              remover
            </button>
          </header>

          <div className="space-y-4 p-4">
            <label className="block">
              <span className={lbl}>Descrição da área</span>
              <textarea
                className={`${field} min-h-[56px] resize-y`}
                value={area.description}
                onChange={(e) => patchArea(ai, { description: e.target.value })}
                placeholder="Por que essa área importa / o que quer desenvolver"
              />
            </label>

            <div className="space-y-3">
              <span className={lbl}>Ações</span>
              {area.actions.map((ac, ci) => (
                <div key={ci} className="rounded-lg bg-neutral-50 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      className={field}
                      value={ac.title}
                      onChange={(e) => patchAction(ai, ci, { title: e.target.value })}
                      placeholder={`Ação ${ci + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patchArea(ai, { actions: area.actions.filter((_, j) => j !== ci) })
                      }
                      className="shrink-0 rounded px-2 py-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      title="Remover ação"
                    >
                      ✕
                    </button>
                  </div>

                  <textarea
                    className={`${field} mt-2 min-h-[44px] resize-y`}
                    value={ac.description}
                    onChange={(e) => patchAction(ai, ci, { description: e.target.value })}
                    placeholder="Descrição da ação (opcional)"
                  />

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <label className="block">
                      <span className={lbl}>Tipo</span>
                      <select
                        className={field}
                        value={ac.kind}
                        onChange={(e) =>
                          patchAction(ai, ci, { kind: e.target.value as ActionKind })
                        }
                      >
                        {KINDS.map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={lbl}>Prazo</span>
                      <input
                        type="date"
                        className={field}
                        value={ac.dueDate}
                        onChange={(e) => patchAction(ai, ci, { dueDate: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className={lbl}>Status</span>
                      <select
                        className={field}
                        value={ac.status}
                        onChange={(e) =>
                          patchAction(ai, ci, { status: e.target.value as Status })
                        }
                      >
                        {STATUSES.map(([s, l]) => (
                          <option key={s} value={s}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => patchArea(ai, { actions: [...area.actions, emptyAction()] })}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
              >
                + adicionar ação
              </button>
            </div>
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={() => setAreas((a) => [...a, emptyArea()])}
        className="w-full rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-semibold text-neutral-500 hover:border-neutral-400 hover:text-neutral-800"
      >
        + adicionar área de desenvolvimento
      </button>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-neutral-200 bg-white/90 py-4 backdrop-blur">
        <button
          type="button"
          disabled={busy || !title.trim() || validAreas.length === 0}
          onClick={save}
          className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {busy ? "Salvando…" : hasExisting ? "Salvar (atualiza o PDI)" : "Salvar PDI"}
        </button>
        <span className="text-xs text-neutral-500">
          {validAreas.length} áreas · {actionCount} ações
        </span>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
