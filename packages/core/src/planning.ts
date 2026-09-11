import { groupOfArea } from "./groups";
import type { Action, Area, PdiDoc, WeekCapacity } from "./types";

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export const WEEK_DAY_LABEL: Record<WeekDay, string> = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom",
};

export const EMPTY_CAPACITY: WeekCapacity = {
  mon: 0,
  tue: 0,
  wed: 0,
  thu: 0,
  fri: 0,
  sat: 0,
  sun: 0,
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function weeklyHours(cap?: WeekCapacity): number {
  if (!cap) return 0;
  return WEEK_DAYS.reduce((s, d) => s + (Number(cap[d]) || 0), 0);
}

// ---------------------------------------------------------------------------
// Progresso real da ação
// ---------------------------------------------------------------------------

/** Fração 0..1 de conclusão real: módulos > horas feitas > status. */
export function actionCompletion(a: Action): number {
  if (a.status === "done") return 1;
  if (a.unitsTotal && a.unitsTotal > 0) {
    return clamp01((a.unitsDone ?? 0) / a.unitsTotal);
  }
  if (a.estimatedHours && a.estimatedHours > 0 && a.hoursDone != null) {
    return clamp01(a.hoursDone / a.estimatedHours);
  }
  return a.status === "doing" ? 0.5 : 0;
}

export const actionEstimatedHours = (a: Action): number => Math.max(0, a.estimatedHours ?? 0);
export const actionDoneHours = (a: Action): number =>
  actionEstimatedHours(a) * actionCompletion(a);
export const actionRemainingHours = (a: Action): number =>
  actionEstimatedHours(a) * (1 - actionCompletion(a));

/**
 * Progresso real da área: média simples do `actionCompletion` de cada ação —
 * NUNCA ponderado por horas. Uma ação medida em módulos e outra em horas
 * contam igual: 50% é 50%, seja qual for a régua usada para chegar lá.
 */
export function areaRealProgress(area: Area): number {
  const acts = area.actions;
  if (acts.length === 0) return 0;
  return avg(acts.map(actionCompletion));
}

export const overallRealProgress = (areas: Area[]): number =>
  avg(areas.map(areaRealProgress));

// ---------------------------------------------------------------------------
// Projeção de prazo
// ---------------------------------------------------------------------------

export interface Projection {
  estimatedHours: number;
  doneHours: number;
  remainingHours: number;
  completion: number;
  weeklyHours: number;
  weeksLeft: number | null;
  projectedDate: string | null;
  /** Maior prazo (dueDate) entre as ações — a "meta". */
  targetDate: string | null;
}

export function projectFromActions(
  actions: Action[],
  cap: WeekCapacity | undefined,
  from: Date,
): Projection {
  const estimatedHours = sum(actions.map(actionEstimatedHours));
  const doneHours = sum(actions.map(actionDoneHours));
  const remainingHours = sum(actions.map(actionRemainingHours));
  const wh = weeklyHours(cap);

  // % concluído: média simples por ação — nunca ponderada por horas (ver areaRealProgress).
  const completion = actions.length ? avg(actions.map(actionCompletion)) : 0;

  let weeksLeft: number | null = null;
  let projectedDate: string | null = null;
  if (wh > 0) {
    weeksLeft = remainingHours / wh;
    const d = new Date(from);
    d.setDate(d.getDate() + Math.ceil(weeksLeft * 7));
    projectedDate = isoDay(d);
  }

  const targets = actions.map((a) => a.dueDate).filter((x): x is string => Boolean(x));
  const targetDate = targets.length ? targets.sort().at(-1)! : null;

  return {
    estimatedHours,
    doneHours,
    remainingHours,
    completion,
    weeklyHours: wh,
    weeksLeft,
    projectedDate,
    targetDate,
  };
}

export type PlanStatus = "sem-capacidade" | "sem-meta" | "adiantado" | "no-ritmo" | "atrasado";

export function planStatus(p: Projection): { status: PlanStatus; weeksLate: number } {
  if (p.remainingHours <= 0) return { status: "no-ritmo", weeksLate: 0 };
  if (p.weeklyHours <= 0 || !p.projectedDate) return { status: "sem-capacidade", weeksLate: 0 };
  if (!p.targetDate) return { status: "sem-meta", weeksLate: 0 };
  const diffDays =
    (Date.parse(p.projectedDate) - Date.parse(p.targetDate)) / 86_400_000;
  const weeksLate = diffDays / 7;
  if (weeksLate > 1) return { status: "atrasado", weeksLate };
  if (weeksLate < -1) return { status: "adiantado", weeksLate };
  return { status: "no-ritmo", weeksLate };
}

// ---------------------------------------------------------------------------
// Rollup do documento inteiro
// ---------------------------------------------------------------------------

export interface BlockPlan {
  groupId: string | null; // null = "avulso" (fora de bloco)
  title: string;
  color: string;
  areaIds: string[];
  actions: Action[];
  projection: Projection;
  status: PlanStatus;
  weeksLate: number;
  /** De propósito fora de foco agora — não conta no resumo geral. */
  paused: boolean;
}

export function planForDoc(
  pdi: PdiDoc,
  from: Date = new Date(),
): { blocks: BlockPlan[]; overallProjectedDate: string | null } {
  const areaById = new Map(pdi.areas.map((a) => [a.id, a]));
  const areaToGroup = groupOfArea(pdi.groups ?? []);

  const blocks: BlockPlan[] = [];

  for (const g of [...(pdi.groups ?? [])].sort((a, b) => a.order - b.order)) {
    const areas = g.areaIds.map((id) => areaById.get(id)).filter((a): a is Area => Boolean(a));
    const actions = areas.flatMap((a) => a.actions);
    const projection = projectFromActions(actions, g.capacity, from);
    const s = planStatus(projection);
    blocks.push({
      groupId: g.id,
      title: g.title,
      color: g.color,
      areaIds: g.areaIds,
      actions,
      projection,
      status: s.status,
      weeksLate: s.weeksLate,
      paused: g.paused ?? false,
    });
  }

  const looseAreas = pdi.areas.filter((a) => !areaToGroup.has(a.id));
  if (looseAreas.length) {
    const actions = looseAreas.flatMap((a) => a.actions);
    const projection = projectFromActions(actions, pdi.looseCapacity, from);
    const s = planStatus(projection);
    blocks.push({
      groupId: null,
      title: "Fora de bloco",
      color: "#6B7280",
      areaIds: looseAreas.map((a) => a.id),
      actions,
      projection,
      status: s.status,
      weeksLate: s.weeksLate,
      paused: false, // não há bloco pra guardar a pausa das áreas soltas
    });
  }

  const dates = blocks
    .map((b) => b.projection.projectedDate)
    .filter((x): x is string => Boolean(x));
  const overallProjectedDate = dates.length ? dates.sort().at(-1)! : null;

  return { blocks, overallProjectedDate };
}

// ---------------------------------------------------------------------------
// Série do gráfico previsto x real (burn-down de horas restantes)
// ---------------------------------------------------------------------------

export interface BurndownSeries {
  total: number;
  spanDays: number;
  /** dias desde o início -> horas restantes previstas */
  planned: { t: number; h: number }[];
  /** dias desde o início -> horas restantes reais */
  actual: { t: number; h: number }[];
}

export function burndownSeries(
  actions: Action[],
  weeklyHrs: number,
  startIso: string,
  todayIso: string,
): BurndownSeries {
  const total = Math.round(sum(actions.map(actionEstimatedHours)) * 10) / 10;
  const start = Date.parse(startIso);
  const today = Date.parse(todayIso);
  const days = (ms: number) => Math.round((ms - start) / 86_400_000);

  // previsto: reta do total -> 0 no ritmo semanal (só quando há capacidade)
  const plannedEndDays = weeklyHrs > 0 ? Math.ceil((total / weeklyHrs) * 7) : 0;
  const spanDays = Math.max(plannedEndDays, days(today), 7);
  const planned =
    weeklyHrs > 0
      ? [
          { t: 0, h: total },
          { t: plannedEndDays, h: 0 },
        ]
      : [];

  // real: degraus nas datas de conclusão + ponto de hoje com o parcial
  const completions = actions
    .filter((a) => a.completedAt && Date.parse(a.completedAt) >= start)
    .map((a) => ({ t: days(Date.parse(a.completedAt!)), h: actionEstimatedHours(a) }))
    .sort((a, b) => a.t - b.t);

  const actual: { t: number; h: number }[] = [{ t: 0, h: total }];
  let burned = 0;
  for (const c of completions) {
    burned += c.h;
    actual.push({ t: Math.max(0, c.t), h: Math.max(0, total - burned) });
  }
  const doneNow = sum(actions.map(actionDoneHours));
  actual.push({ t: Math.max(days(today), 0), h: Math.max(0, total - doneNow) });

  return { total, spanDays, planned, actual };
}

/**
 * Interpola a reta do "previsto" (2 pontos: início e fim no ritmo) num
 * instante `t` — quantas horas se esperava ter restando nesse dia. Usado
 * pra converter em "% esperado hoje" (ver `PctBar` em apps/web).
 */
export function plannedRemainingAt(series: BurndownSeries, t: number): number {
  const [a, b] = series.planned;
  if (!a || !b || b.t === a.t) return a?.h ?? 0;
  if (t <= a.t) return a.h;
  if (t >= b.t) return b.h;
  return a.h + ((b.h - a.h) * (t - a.t)) / (b.t - a.t);
}
