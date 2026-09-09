import { ACTION_STATUS_LABEL, AREA_STATUS_LABEL } from "./labels";
import { areaProgress, formatPercent, overallProgress } from "./progress";
import type { PdiDoc } from "./types";

function br(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? "");
}

/**
 * Monta o prompt para o Gemini gerar um resumo executivo do PDI para a
 * reunião de 1-on-1 com o gestor.
 */
export function buildInsightPrompt(pdi: PdiDoc): string {
  const out: string[] = [];
  const overall = formatPercent(overallProgress(pdi.areas));

  out.push(
    `Você é meu parceiro de carreira. Abaixo está meu Plano de Desenvolvimento ` +
      `Individual (PDI) — ciclo "${pdi.root.title}"` +
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

  out.push("");
  out.push("## O que eu preciso");
  out.push(
    "Prepare um resumo executivo curto (em português, com bullets) para minha " +
      "reunião de 1-on-1 com meu gestor, cobrindo:",
  );
  out.push("1. Entregas concluídas neste ciclo — os destaques.");
  out.push("2. O que está em andamento e onde há risco de prazo.");
  out.push("3. Lacunas de aprendizado e próximos passos sugeridos, em ordem de prioridade.");
  out.push(
    "4. 2 a 3 argumentos objetivos para eu pedir apoio (tempo protegido, mentoria, " +
      "verba de curso), ligando cada pedido a um resultado para a equipe.",
  );
  out.push("Seja direto; nada de introdução longa.");

  return out.join("\n");
}
