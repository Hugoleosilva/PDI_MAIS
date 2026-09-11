"use client";

import { useMemo, useRef, useState } from "react";
import {
  actionCompletion,
  burndownSeries,
  EMPTY_CAPACITY,
  formatPercent,
  planForDoc,
  plannedRemainingAt,
  weeklyHours,
  type Action,
  type PdiDoc,
  type PlanStatus,
  type WeekCapacity,
} from "@pdi-mais/core";
import { brand } from "@/lib/theme";
import { formatDate } from "@/lib/format";
import { WeekGrid } from "./WeekGrid";
import { PctBar } from "./PctBar";

const STATUS_LABEL: Record<Status, string> = {
  todo: "Não iniciado",
  doing: "Em progresso",
  done: "Finalizado",
};
type Status = "todo" | "doing" | "done";

const STATUS_COLOR: Record<Status, string> = {
  todo: brand.gray,
  doing: brand.orange,
  done: brand.teal,
};

const PLAN_BADGE: Record<PlanStatus, { label: string; bg: string; fg: string }> = {
  "no-ritmo": { label: "No ritmo", bg: "#DCFCE7", fg: "#15803d" },
  adiantado: { label: "Adiantado", bg: "#DBEAFE", fg: "#1d4ed8" },
  atrasado: { label: "Atrasado", bg: "#FEE2E2", fg: "#b91c1c" },
  "sem-capacidade": { label: "Defina a capacidade", bg: "#F3F4F6", fg: "#6b7280" },
  "sem-meta": { label: "Sem prazo definido", bg: "#F3F4F6", fg: "#6b7280" },
};

type ProgMode = "units" | "hours" | "status";

const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v) || 0));

const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function PlanningView({ pdi, today }: { pdi: PdiDoc; today: string }) {
  const [doc, setDoc] = useState<PdiDoc>(pdi);
  // aberto por padrão só nos blocos que começaram sem carga horária nenhuma —
  // decidido UMA vez a partir do estado inicial, pra não fechar sozinho
  // no meio da digitação (a projeção muda a cada tecla).
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial = planForDoc(pdi, new Date(today));
    return Object.fromEntries(
      initial.blocks.map((b) => [b.groupId ?? "loose", b.projection.estimatedHours === 0]),
    );
  });
  const [modes, setModes] = useState<Record<string, ProgMode>>({});

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, Record<string, unknown>>>({});
  const debounce = (key: string, fn: () => void, ms = 650) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
  };

  const plan = useMemo(() => planForDoc(doc, new Date(today)), [doc, today]);

  // ---- edições ----
  const patchAction = (id: string, patch: Record<string, unknown>) => {
    setDoc((d) => ({
      ...d,
      areas: d.areas.map((ar) => ({
        ...ar,
        actions: ar.actions.map((a) => {
          if (a.id !== id) return a;
          const next: Record<string, unknown> = { ...a };
          for (const [k, v] of Object.entries(patch)) {
            if (v === null) delete next[k];
            else next[k] = v;
          }
          if (patch.status === "done" && !next.completedAt) next.completedAt = today;
          if (patch.status && patch.status !== "done") delete next.completedAt;
          return next as unknown as Action;
        }),
      })),
    }));
    pending.current[id] = { ...(pending.current[id] ?? {}), ...patch };
    debounce(`a:${id}`, () => {
      const body = pending.current[id];
      delete pending.current[id];
      if (body && Object.keys(body).length) {
        void fetch(`/api/pdi/action/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }).catch(() => {});
      }
    });
  };

  const saveGroups = () =>
    debounce("groups", () => {
      void fetch("/api/pdi/groups", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groups: doc.groups ?? [] }),
      }).catch(() => {});
    });

  const setGroupCapacity = (gid: string, cap: WeekCapacity) => {
    setDoc((d) => ({
      ...d,
      groups: (d.groups ?? []).map((g) => (g.id === gid ? { ...g, capacity: cap } : g)),
    }));
    saveGroups();
  };

  const setLoose = (cap: WeekCapacity) => {
    setDoc((d) => ({ ...d, looseCapacity: cap }));
    debounce("loose", () => {
      void fetch("/api/pdi/capacity", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cap),
      }).catch(() => {});
    });
  };

  // resumo geral: distribuição por status — nada de somar capacidade de
  // blocos diferentes (ninguém trabalha em todos ao mesmo tempo).
  const allActions = doc.areas.flatMap((ar) => ar.actions);
  const totalActions = allActions.length;
  const countOf = (s: Status) => allActions.filter((a) => a.status === s).length;
  const statusCounts: Record<Status, number> = {
    todo: countOf("todo"),
    doing: countOf("doing"),
    done: countOf("done"),
  };
  const overallPct = totalActions ? statusCounts.done / totalActions : 0;

  const actionsById = new Map(doc.areas.flatMap((ar) => ar.actions.map((a) => [a.id, a])));

  return (
    <div className="space-y-8">
      {/* resumo geral — distribuição por status, não soma de horas de blocos diferentes */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Andamento geral do PDI
          </h2>
          <span className="text-lg font-bold" style={{ color: brand.ink }}>
            {formatPercent(overallPct)} finalizado
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {totalActions} ações no total · não somamos a carga horária dos blocos porque
          ninguém trabalha em todos ao mesmo tempo — cada bloco tem seu ritmo abaixo.
        </p>

        {totalActions > 0 && (
          <div className="mt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {(["done", "doing", "todo"] as Status[]).map((s) =>
                statusCounts[s] > 0 ? (
                  <div
                    key={s}
                    style={{
                      width: `${(statusCounts[s] / totalActions) * 100}%`,
                      background: STATUS_COLOR[s],
                    }}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              {(["todo", "doing", "done"] as Status[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: STATUS_COLOR[s] }}
                  />
                  <b style={{ color: brand.ink }}>{statusCounts[s]}</b>
                  <span style={{ color: brand.muted }}>
                    {STATUS_LABEL[s].toLowerCase()} (
                    {formatPercent(totalActions ? statusCounts[s] / totalActions : 0)})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {plan.blocks.map((b) => {
        const badge = PLAN_BADGE[b.status];
        const cap =
          b.groupId === null
            ? (doc.looseCapacity ?? EMPTY_CAPACITY)
            : (doc.groups?.find((g) => g.id === b.groupId)?.capacity ?? EMPTY_CAPACITY);
        const done = b.actions
          .map((a) => a.completedAt)
          .filter((x): x is string => Boolean(x) && x! < today)
          .sort();
        const start = done[0] ?? addDays(today, -21);
        const series = burndownSeries(b.actions, weeklyHours(cap), start, today);
        const todayT = Math.max(0, daysBetween(start, today));
        const expectedPct =
          series.planned.length && series.total > 0
            ? 1 - plannedRemainingAt(series, todayT) / series.total
            : null;
        const key = b.groupId ?? "loose";
        const isOpen = open[key] ?? false;

        return (
          <section
            key={b.groupId ?? "loose"}
            className="rounded-xl border border-neutral-200 bg-white"
          >
            <header className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-5 py-3.5">
              <span className="h-3 w-3 rounded-full" style={{ background: b.color }} />
              <h3 className="text-[15px] font-semibold">{b.title}</h3>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: badge.bg, color: badge.fg }}
              >
                {badge.label}
                {b.status === "atrasado" && ` · ${Math.ceil(b.weeksLate)} sem`}
              </span>
              <span className="ml-auto text-xs text-neutral-500">
                {b.projection.projectedDate
                  ? `prev. ${formatDate(b.projection.projectedDate)}`
                  : "sem projeção"}
                {b.projection.targetDate && ` · meta ${formatDate(b.projection.targetDate)}`}
              </span>
            </header>

            <div className="space-y-4 p-5">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Horas disponíveis por semana
                </p>
                <WeekGrid
                  value={cap}
                  onChange={(v) =>
                    b.groupId === null ? setLoose(v) : setGroupCapacity(b.groupId, v)
                  }
                />
              </div>

              {b.actions.length > 0 && (
                <div className="rounded-lg border border-neutral-100 bg-neutral-50/60 p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Andamento — real × previsto
                  </p>
                  <PctBar
                    realPct={b.projection.completion}
                    expectedPct={expectedPct}
                    color={badge.fg}
                  />
                  {expectedPct == null && (
                    <p className="mt-2 text-[11px] text-neutral-400">
                      Preencha a carga horária de ao menos uma ação e as horas por semana
                      acima pra ver a comparação com o previsto.
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
              >
                {isOpen ? "▾ ocultar" : "▸ editar"} · {b.actions.length} ações — carga
                horária e progresso
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-neutral-100 px-5 py-4">
                <div className="space-y-2">
                  {b.actions.map((a) => {
                    const act = actionsById.get(a.id) ?? a;
                    const derived: ProgMode =
                      act.unitsTotal != null || act.unitsLabel
                        ? "units"
                        : act.hoursDone != null
                          ? "hours"
                          : "status";
                    const mode = modes[a.id] ?? derived;
                    const setMode = (m: ProgMode) => {
                      setModes((x) => ({ ...x, [a.id]: m }));
                      if (m === "units") {
                        patchAction(a.id, {
                          hoursDone: null,
                          unitsLabel: act.unitsLabel ?? "módulos",
                        });
                      } else if (m === "hours") {
                        patchAction(a.id, {
                          unitsTotal: null,
                          unitsDone: null,
                          unitsLabel: null,
                        });
                      } else {
                        patchAction(a.id, {
                          unitsTotal: null,
                          unitsDone: null,
                          unitsLabel: null,
                          hoursDone: null,
                        });
                      }
                    };

                    return (
                      <div key={a.id} className="rounded-lg bg-neutral-50 p-3">
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                          <p className="text-[13px] font-medium">{act.title}</p>
                          <span className="shrink-0 text-[11px] font-semibold text-neutral-500">
                            {formatPercent(actionCompletion(act))} concluído
                          </span>
                        </div>

                        <div className="flex flex-wrap items-end gap-x-3 gap-y-2 text-xs">
                          <Field label="Carga horária" hint="opcional — só p/ prever a data">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={act.estimatedHours ?? ""}
                                onChange={(e) =>
                                  patchAction(a.id, { estimatedHours: num(e.target.value) })
                                }
                                className={inp}
                              />
                              <span className="text-neutral-400">h</span>
                            </div>
                          </Field>

                          <Field label="Medir progresso por">
                            <select
                              value={mode}
                              onChange={(e) => setMode(e.target.value as ProgMode)}
                              className={`${inp} w-auto`}
                            >
                              <option value="units">Módulos / aulas</option>
                              <option value="hours">Horas feitas</option>
                              <option value="status">Status</option>
                            </select>
                          </Field>

                          {mode === "units" && (
                            <Field label={`${act.unitsLabel || "unidades"} feitas / total`}>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={act.unitsDone ?? ""}
                                  onChange={(e) =>
                                    patchAction(a.id, { unitsDone: num(e.target.value) })
                                  }
                                  className={inp}
                                />
                                <span className="text-neutral-400">de</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={act.unitsTotal ?? ""}
                                  onChange={(e) =>
                                    patchAction(a.id, { unitsTotal: num(e.target.value) })
                                  }
                                  className={inp}
                                />
                                <input
                                  type="text"
                                  value={act.unitsLabel ?? ""}
                                  placeholder="módulos"
                                  onChange={(e) =>
                                    patchAction(a.id, {
                                      unitsLabel: e.target.value.trim() || null,
                                    })
                                  }
                                  className={`${inp} w-24 text-left`}
                                />
                              </div>
                            </Field>
                          )}

                          {mode === "hours" && (
                            <Field label="Horas feitas">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={act.hoursDone ?? ""}
                                  onChange={(e) =>
                                    patchAction(a.id, { hoursDone: num(e.target.value) })
                                  }
                                  className={inp}
                                />
                                <span className="text-neutral-400">
                                  de {act.estimatedHours ?? "—"}h
                                </span>
                              </div>
                            </Field>
                          )}

                          <Field label="Status">
                            <select
                              value={act.status}
                              onChange={(e) => patchAction(a.id, { status: e.target.value })}
                              className={`${inp} w-auto`}
                            >
                              {(["todo", "doing", "done"] as Status[]).map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABEL[s]}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const inp =
  "w-16 rounded border border-neutral-300 bg-white px-1.5 py-1 text-center text-sm text-neutral-900 outline-none focus:border-neutral-900";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
        {hint && <span className="ml-1 font-normal normal-case text-neutral-400">({hint})</span>}
      </span>
      {children}
    </label>
  );
}
