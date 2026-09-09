import type { PdiDoc, PdiGroup } from "./types";

/** Paleta dos blocos (também oferecida ao usuário para trocar a cor). */
export const GROUP_COLORS = [
  "#2563EB", // azul
  "#7C3AED", // roxo
  "#0D9488", // verde-azulado
  "#D97706", // âmbar
  "#DC2626", // vermelho
  "#6B7280", // cinza
] as const;

/**
 * Blocos estratégicos sugeridos para o PDI do Hugo (2026), por título de área.
 * Ver docs/PROGRESSO.md.
 */
export const SEED_GROUPS: { title: string; color: string; areaTitles: string[] }[] = [
  {
    title: "Core · Engenharia Full-Stack",
    color: "#2563EB",
    areaTitles: [
      "Tecnologias de Backend",
      "Tecnologias de Frontend",
      "Inovação Aplicada e Soluções Corporativas (TideFlow / Protrack)",
    ],
  },
  {
    title: "Inteligência · IA, Agentes & Automação",
    color: "#7C3AED",
    areaTitles: ["Inteligência Artificial / Automação"],
  },
  {
    title: "Plataforma · Dados & Integrações",
    color: "#0D9488",
    areaTitles: ["Engenharia e Análise de Dados"],
  },
  {
    title: "Institucional & Carreira",
    color: "#D97706",
    areaTitles: [
      "Competências Comportamentais e Colaboração Organizacional",
      "Inglês Técnico e Comunicação Profissional",
    ],
  },
  {
    title: "Opcional · Plataformas Alternativas",
    color: "#6B7280",
    areaTitles: ["Desenvolvimento Low-Code / Full-Stack"],
  },
];

/** Resolve os títulos das áreas do SEED_GROUPS para os ids reais do documento. */
export function resolveSeedGroups(pdi: PdiDoc): PdiGroup[] {
  const idByTitle = new Map(pdi.areas.map((a) => [a.title, a.id]));
  return SEED_GROUPS.map((g, i) => ({
    id: `g${i + 1}`,
    title: g.title,
    color: g.color,
    order: i,
    areaIds: g.areaTitles
      .map((t) => idByTitle.get(t))
      .filter((x): x is string => Boolean(x)),
  }));
}

/** Mapa areaId -> groupId (uma área pertence a no máximo um bloco). */
export function groupOfArea(groups: PdiGroup[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const g of groups) for (const id of g.areaIds) m.set(id, g.id);
  return m;
}
