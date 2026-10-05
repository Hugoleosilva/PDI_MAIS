import { GROUP_COLORS } from "./groups";
import { normalizeTitle } from "./ids";
import type { PdiDoc, PdiGroup } from "./types";

/**
 * Prompt pra pedir ao Gemini uma sugestão de agrupamento em blocos temáticos
 * — mesmo padrão de `buildInsightPrompt` (copiar/colar manual, sem API key).
 */
export function buildGroupingPrompt(pdi: PdiDoc): string {
  const areas = pdi.areas
    .map((a) => {
      const desc = a.description ? ` — ${a.description.replace(/\s*\n\s*/g, " ").trim()}` : "";
      return `- "${a.title}"${desc}`;
    })
    .join("\n");

  return [
    "Você é meu parceiro de carreira, organizando meu roadmap de desenvolvimento.",
    "Abaixo estão as áreas de desenvolvimento do meu PDI, uma por linha:",
    "",
    areas,
    "",
    'Agrupe essas áreas em blocos temáticos (macro-domínios da carreira — ex.: "Engenharia ' +
      'de Software", "IA & Automação", "Soft Skills"; ajuste aos temas que realmente aparecem acima).',
    "Cada área entra em EXATAMENTE um bloco. Não invente área nova e não mude o texto do título.",
    "",
    "Responda SOMENTE com um JSON (sem markdown, sem texto antes ou depois), no formato:",
    '[{"title": "Nome do bloco", "areaTitles": ["título exato de uma área", "..."]}, ...]',
  ].join("\n");
}

export interface GroupingSuggestion {
  groups: PdiGroup[];
  /** Títulos que o Gemini devolveu mas não bateram com nenhuma área real. */
  unmatched: string[];
}

/**
 * Interpreta a resposta colada do Gemini e devolve blocos prontos pra aplicar
 * — títulos batem por igualdade normalizada (acento/caixa), igual ao
 * casamento de ID de área em `merge.ts`. Uma área só entra no PRIMEIRO
 * bloco que a reivindicar, pra nunca duplicar.
 */
export function parseGroupingSuggestion(pdi: PdiDoc, raw: string): GroupingSuggestion {
  const idByNormalizedTitle = new Map(pdi.areas.map((a) => [normalizeTitle(a.title), a.id]));
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  const text = jsonMatch ? jsonMatch[0] : raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "Não consegui ler isso como JSON — confere se colou a resposta completa do Gemini.",
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Formato inesperado — esperava uma lista de blocos.");
  }

  const unmatched: string[] = [];
  const claimed = new Set<string>();
  const groups: PdiGroup[] = [];

  parsed.forEach((entry, i) => {
    const g = entry as { title?: unknown; areaTitles?: unknown };
    if (typeof g.title !== "string" || !Array.isArray(g.areaTitles)) return;

    const areaIds: string[] = [];
    for (const t of g.areaTitles) {
      if (typeof t !== "string") continue;
      const id = idByNormalizedTitle.get(normalizeTitle(t));
      if (!id) {
        unmatched.push(t);
      } else if (!claimed.has(id)) {
        areaIds.push(id);
        claimed.add(id);
      }
    }
    if (areaIds.length > 0) {
      groups.push({
        id: `ai-${i + 1}`,
        title: g.title,
        color: GROUP_COLORS[i % GROUP_COLORS.length],
        order: i,
        areaIds,
      });
    }
  });

  return { groups, unmatched };
}
