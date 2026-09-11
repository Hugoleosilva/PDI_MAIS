import { ACTION_STATUS_LABEL, AREA_STATUS_LABEL } from "./labels";
import { areaProgress, formatPercent, overallProgress } from "./progress";
import type { PdiDoc } from "./types";

function br(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? "");
}

/** O que o usuário quer saber — determina só o pedido final do prompt. */
export type InsightKind = "1on1" | "insights" | "overall" | "focus" | "tech";

export const INSIGHT_KIND_LABEL: Record<InsightKind, string> = {
  "1on1": "Resumo p/ 1-on-1",
  insights: "Insights sobre o PDI",
  overall: "Andamento geral",
  focus: "Onde focar agora",
  tech: "Sugestão de tecnologia ou curso",
};

export const INSIGHT_KIND_HINT: Record<InsightKind, string> = {
  "1on1": "resumo executivo pronto pra levar pro gestor",
  insights: "padrões, riscos e lacunas que talvez eu não tenha percebido",
  overall: "raio-x do que está adiantado, no ritmo e atrasado",
  focus: "as poucas ações que valem minha atenção nas próximas semanas",
  tech: "tecnologias, certificações ou cursos pra complementar o plano",
};

const ASKS: Record<InsightKind, string[]> = {
  "1on1": [
    "Prepare um resumo executivo curto (em português, com bullets) para minha " +
      "reunião de 1-on-1 com meu gestor, cobrindo:",
    "1. Entregas concluídas neste ciclo — os destaques.",
    "2. O que está em andamento e onde há risco de prazo.",
    "3. Lacunas de aprendizado e próximos passos sugeridos, em ordem de prioridade.",
    "4. 2 a 3 argumentos objetivos para eu pedir apoio (tempo protegido, mentoria, " +
      "verba de curso), ligando cada pedido a um resultado para a equipe.",
    "Seja direto; nada de introdução longa.",
  ],
  insights: [
    "Olhando esse PDI de fora, aponte de 3 a 5 insights — padrões, riscos ou " +
      "lacunas que eu, por estar dentro do dia a dia, talvez não tenha percebido.",
    "Para cada insight: o que você notou, por que importa, e uma ação prática " +
      "que eu possa tomar essa semana.",
    "Seja direto; nada de introdução longa.",
  ],
  overall: [
    "Faça um raio-x do andamento geral do PDI:",
    "1. Qual a % geral e o que falta pra chegar em 100%.",
    "2. Quais áreas estão adiantadas, no ritmo e atrasadas — e qual é a mais crítica agora.",
    "3. Se der pra notar pelo texto, algum sinal de estagnação (ação em " +
      "\"em andamento\" há muito tempo, sem descrição de progresso).",
    "Responda em bullets, direto ao ponto.",
  ],
  focus: [
    "Considerando prazos, o que está represado e o impacto de cada coisa, diga " +
      "em quais 1 a 3 ações eu deveria focar primeiro nas próximas 2-3 semanas.",
    "Para cada uma: por que ela primeiro, e o que eu devo entregar/mostrar de progresso.",
    "Ignore o resto — não liste tudo, só o que realmente merece foco agora.",
  ],
  tech: [
    "Com base nas áreas e ações abaixo, sugira tecnologias, certificações ou " +
      "cursos específicos (nomes reais, não genéricos) que complementem esse plano.",
    "Agrupe por área de desenvolvimento; para cada sugestão, uma frase dizendo " +
      "por que ela se encaixa no que já está no PDI.",
    "No máximo 2-3 sugestões por área — priorize qualidade sobre quantidade.",
  ],
};

function buildContextBlock(pdi: PdiDoc): string {
  const out: string[] = [];
  const overall = formatPercent(overallProgress(pdi.areas));

  out.push(
    `Abaixo está meu Plano de Desenvolvimento Individual (PDI) — ciclo ` +
      `"${pdi.root.title}"` +
      (pdi.root.track ? `, trilha "${pdi.root.track}"` : "") +
      `. Progresso geral: ${overall} (média dos percentuais das áreas).`,
  );
  out.push("");
  out.push("## Áreas de desenvolvimento");

  for (const area of pdi.areas) {
    out.push("");
    out.push(
      `### ${area.title} — ${AREA_STATUS_LABEL[area.status]} · ${formatPercent(areaProgress(area))}`,
    );
    if (area.description) out.push(area.description.replace(/\s*\n\s*/g, " ").trim());
    for (const a of area.actions) {
      const meta = [ACTION_STATUS_LABEL[a.status]];
      if (a.dueDate) meta.push(`prazo ${br(a.dueDate)}`);
      out.push(`- ${a.title} — ${meta.join(", ")}`);
      if (a.description) {
        out.push(`  (contexto: ${a.description.replace(/\s*\n\s*/g, " ").trim()})`);
      }
    }
  }

  return out.join("\n");
}

/**
 * Monta o prompt para o Gemini. `kind` escolhe o que o usuário quer saber —
 * o contexto do PDI (áreas/ações/progresso) é sempre o mesmo, só o pedido
 * final muda.
 */
export function buildInsightPrompt(pdi: PdiDoc, kind: InsightKind = "1on1"): string {
  const out: string[] = [
    "Você é meu parceiro de carreira.",
    buildContextBlock(pdi),
    "",
    "## O que eu preciso",
    ...ASKS[kind],
  ];
  return out.join("\n");
}
