import type { Area } from "./types";

/** Fração 0..1 de ações finalizadas na área (= % da plataforma). */
export function areaProgress(area: Area): number {
  if (area.actions.length === 0) return 0;
  const done = area.actions.filter((a) => a.status === "done").length;
  return done / area.actions.length;
}

/**
 * Progresso geral do PDI = MÉDIA dos percentuais das áreas.
 * (Confirmado na plataforma: não é total de ações concluídas ÷ total geral.)
 */
export function overallProgress(areas: Area[]): number {
  if (areas.length === 0) return 0;
  return areas.reduce((sum, area) => sum + areaProgress(area), 0) / areas.length;
}

/** True se a área tem alguma ação "Não iniciado" (ícone de relógio na plataforma). */
export function hasNotStarted(area: Area): boolean {
  return area.actions.some((a) => a.status === "todo");
}

/** 0.3333 -> "33,33%" (pt-BR, no máximo 2 casas). */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}%`;
}
