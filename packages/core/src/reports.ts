import { areaProgress, overallProgress } from "./progress";
import type { PdiDoc, ProgressSnapshot } from "./types";

/** Quantos relatórios ficam guardados (o mais antigo cai). */
export const MAX_REPORTS = 60;

/** Fotografa o andamento atual do PDI — vira uma entrada no histórico. */
export function buildSnapshot(pdi: PdiDoc, now: Date = new Date()): ProgressSnapshot {
  return {
    id: `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    generatedAt: now.toISOString(),
    overall: overallProgress(pdi.areas),
    areas: pdi.areas.map((a) => ({ id: a.id, title: a.title, progress: areaProgress(a) })),
  };
}

/** Anexa um snapshot ao histórico, cortando o mais antigo se passar do limite. */
export function appendSnapshot(
  reports: ProgressSnapshot[] | undefined,
  snapshot: ProgressSnapshot,
): ProgressSnapshot[] {
  const next = [...(reports ?? []), snapshot];
  return next.length > MAX_REPORTS ? next.slice(next.length - MAX_REPORTS) : next;
}

/**
 * Diferença de andamento geral entre dois relatórios, em pontos percentuais
 * (ex.: 8.5 = subiu 8,5 p.p.). `null` quando não há relatório anterior.
 */
export function snapshotDelta(
  prev: ProgressSnapshot | undefined,
  cur: ProgressSnapshot,
): number | null {
  if (!prev) return null;
  return Math.round((cur.overall - prev.overall) * 1000) / 10;
}
