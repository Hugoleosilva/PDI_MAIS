import type { ActionKind, AreaKind, Status } from "./types";

/** Rótulos de status da AÇÃO na plataforma (masculino). */
export const ACTION_STATUS_LABEL: Record<Status, string> = {
  todo: "Não iniciado",
  doing: "Em progresso",
  done: "Finalizado",
};

/** Rótulos de status da ÁREA na plataforma (feminino). */
export const AREA_STATUS_LABEL: Record<Status, string> = {
  todo: "Não iniciada",
  doing: "Em progresso",
  done: "Finalizada",
};

export const AREA_KIND_LABEL: Record<AreaKind, string> = {
  desenvolver: "Desenvolver",
  potencializar: "Potencializar",
};

export const ACTION_KIND_LABEL: Record<ActionKind, string> = {
  desafio_profissional: "Desafio profissional",
  treinamento_estudo: "Treinamento e estudo",
  mentoria_feedback: "Mentoria e feedbacks",
  outro: "Outro",
};

/** Aceita rótulo da plataforma OU valor canônico e devolve o Status canônico. */
export function statusFromLabel(input: string): Status {
  const n = input.trim().toLowerCase();
  if (n === "todo" || n === "doing" || n === "done") return n;
  if (n.startsWith("não inici") || n.startsWith("nao inici")) return "todo";
  if (n.startsWith("em progresso") || n.startsWith("em andamento")) return "doing";
  if (n.startsWith("finaliz") || n.startsWith("conclu")) return "done";
  return "todo";
}

export function areaKindFromLabel(input: string | undefined): AreaKind {
  return input?.trim().toLowerCase().startsWith("potencial")
    ? "potencializar"
    : "desenvolver";
}

export function actionKindFromLabel(input: string | undefined): ActionKind {
  const n = (input ?? "").trim().toLowerCase();
  if (n.startsWith("desafio")) return "desafio_profissional";
  if (n.startsWith("treinamento") || n.startsWith("learning")) return "treinamento_estudo";
  if (n.startsWith("mentoria")) return "mentoria_feedback";
  if (n === "desafio_profissional" || n === "treinamento_estudo" || n === "mentoria_feedback" || n === "outro") {
    return n as ActionKind;
  }
  return "outro";
}
