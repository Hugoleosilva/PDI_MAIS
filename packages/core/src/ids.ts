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
 * Hash determinístico (cyrb53) — puro JS, roda no servidor e no cliente.
 * Não é criptográfico: serve só para casar áreas/ações entre syncs.
 */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, "0");
}

/**
 * ID determinístico a partir de um ou mais títulos.
 * Mesmo texto (ignorando acento/caixa/espaço) => mesmo ID => merge idempotente.
 */
export function stableId(...parts: string[]): string {
  return cyrb53(parts.map(normalizeTitle).join(" :: "));
}

export const areaId = (areaTitle: string): string => stableId(areaTitle);

export const actionId = (areaTitle: string, actionTitle: string): string =>
  stableId(areaTitle, actionTitle);
