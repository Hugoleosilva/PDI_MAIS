import { createHash } from "node:crypto";

/** Marcas diacríticas combinantes (acentos após NFKD): U+0300–U+036F. */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Normaliza um título para gerar IDs estáveis entre syncs:
 * remove acentos, colapsa espaços, caixa baixa.
 */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ID determinístico a partir de um ou mais títulos.
 * Mesmo texto (ignorando acento/caixa/espaço) => mesmo ID => merge idempotente.
 */
export function stableId(...parts: string[]): string {
  const key = parts.map(normalizeTitle).join(" :: ");
  return createHash("sha1").update(key).digest("hex").slice(0, 16);
}

export const areaId = (areaTitle: string): string => stableId(areaTitle);

export const actionId = (areaTitle: string, actionTitle: string): string =>
  stableId(areaTitle, actionTitle);
