import type { Status } from "@pdi-mais/core";

/**
 * Paleta seguindo o padrão da plataforma de PDI:
 * - laranja = em progresso / marca
 * - cinza   = não iniciado
 * - verde-água = finalizado
 * - azul    = progresso geral (barra do topo) / nó raiz
 */
export const brand = {
  orange: "#E8590C",
  orangeSoft: "#FCEBD7",
  orangeText: "#9A4408",
  gray: "#A1A1AA",
  graySoft: "#ECECEF",
  grayText: "#5F5F68",
  teal: "#12A594",
  tealSoft: "#D5F2EA",
  tealText: "#0C6B60",
  blue: "#2563EB",
  blueSoft: "#DEE9FF",
  pageBg: "#F4F4F5",
  card: "#FFFFFF",
  border: "#E4E4E7",
  ink: "#27272A",
  muted: "#71717A",
} as const;

export interface StatusStyle {
  label: string;
  /** cor da borda do card / do traço da aresta */
  accent: string;
  /** fundo do badge */
  badgeBg: string;
  /** texto do badge */
  badgeText: string;
}

const ACTION: Record<Status, StatusStyle> = {
  todo: { label: "Não iniciado", accent: brand.gray, badgeBg: brand.graySoft, badgeText: brand.grayText },
  doing: { label: "Em progresso", accent: brand.orange, badgeBg: brand.orangeSoft, badgeText: brand.orangeText },
  done: { label: "Finalizado", accent: brand.teal, badgeBg: brand.tealSoft, badgeText: brand.tealText },
};

const AREA: Record<Status, StatusStyle> = {
  todo: { ...ACTION.todo, label: "Não iniciada" },
  doing: { ...ACTION.doing, label: "Em progresso" },
  done: { ...ACTION.done, label: "Finalizada" },
};

export const statusStyle = (status: Status, kind: "area" | "action"): StatusStyle =>
  kind === "area" ? AREA[status] : ACTION[status];
