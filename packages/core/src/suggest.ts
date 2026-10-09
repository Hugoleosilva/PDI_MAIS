import { z } from "zod";
import { buildContextBlock } from "./insight";
import { ACTION_KIND_LABEL, ACTION_STATUS_LABEL, AREA_KIND_LABEL } from "./labels";
import { incomingAreaSchema } from "./schema";
import type { Area, PdiDoc } from "./types";

/**
 * Prompt do "Assistente de desenvolvimento" — mesmo contexto do
 * `buildInsightPrompt` (áreas/ações/status/progresso), pedido diferente:
 * uma análise narrativa (pontos fortes/a melhorar) + sugestão de NOVAS áreas
 * de desenvolvimento com ações já tipadas, prontas pra revisão do usuário.
 */
export function buildDiagnosisPrompt(pdi: PdiDoc): string {
  return [
    "Você é meu parceiro de carreira, analisando meu PDI pra me ajudar a planejar os próximos passos.",
    buildContextBlock(pdi),
    "",
    "## O que eu preciso",
    "Responda SOMENTE com um JSON (sem markdown, sem texto antes ou depois), no formato:",
    "{",
    '  "strengths": [{"title": "...", "detail": "..."}],',
    '  "improvements": [{"title": "...", "detail": "..."}],',
    '  "suggestedAreas": [',
    "    {",
    '      "title": "...",',
    '      "description": "...",',
    '      "rationale": "...",',
    '      "actions": [{"title": "...", "kind": "...", "description": "..."}]',
    "    }",
    "  ]",
    "}",
    "",
    "Regras:",
    "- 3 a 4 `strengths` e 3 a 4 `improvements` — título curto + 1-2 frases cada, " +
      "baseado SÓ no que está nas áreas/ações acima (nunca invente avaliação, " +
      "feedback ou dado que não está listado).",
    "- 2 a 4 `suggestedAreas`: áreas de desenvolvimento NOVAS, que ainda não " +
      "existem na lista acima (não repita nenhum título de área já existente).",
    "- Cada área sugerida tem 2 a 4 `actions`. O campo `kind` de cada ação tem " +
      `que ser EXATAMENTE um destes rótulos: "${ACTION_KIND_LABEL.treinamento_estudo}", ` +
      `"${ACTION_KIND_LABEL.desafio_profissional}" ou "${ACTION_KIND_LABEL.mentoria_feedback}".`,
    '- O campo da área sugerida que explica do que ela trata é SEMPRE ' +
      '`description` — nunca use `detail` aí (esse nome é só pra ' +
      "`strengths`/`improvements`).",
    "- `rationale` explica por que essa área/ação ajuda, ligando ao que foi " +
      "observado nos pontos a melhorar.",
  ].join("\n");
}

export interface DiagnosisPoint {
  title: string;
  detail: string;
}

export interface SuggestedAction {
  title: string;
  kind?: string;
  description?: string;
}

export interface SuggestedArea {
  title: string;
  description?: string;
  rationale?: string;
  actions: SuggestedAction[];
}

export interface DiagnosisSuggestion {
  strengths: DiagnosisPoint[];
  improvements: DiagnosisPoint[];
  suggestedAreas: SuggestedArea[];
}

function asPointList(value: unknown): DiagnosisPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (p): p is { title: string; detail: string } =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as { title?: unknown }).title === "string" &&
        typeof (p as { detail?: unknown }).detail === "string",
    )
    .map((p) => ({ title: p.title.trim(), detail: p.detail.trim() }))
    .filter((p) => p.title && p.detail);
}

/**
 * Interpreta a resposta do Gemini — valida só a FORMA (arrays existem,
 * título/kind não vazios). A validação FORTE (kind/status canônicos, limites
 * de tamanho) acontece de graça quando a payload final passa por
 * `syncPayloadSchema`, na hora de criar de verdade — não duplica aqui.
 */
export function parseDiagnosisResponse(raw: string): DiagnosisSuggestion {
  // remove cerca de código markdown (```json ... ```) antes de extrair —
  // o Gemini às vezes embrulha a resposta mesmo com instrução de "JSON puro".
  const unfenced = raw.replace(/```[a-z]*\n?/gi, "");
  const jsonMatch = unfenced.match(/\{[\s\S]*\}/);
  const text = jsonMatch ? jsonMatch[0] : unfenced;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // inclui um pedaço da resposta crua no erro — sem isso, uma falha de
    // parsing vira uma caixa-preta (confirmado em teste real: não dava pra
    // saber se veio truncado, com markdown, ou com texto antes/depois).
    const snippet = raw.length > 300 ? `${raw.slice(0, 150)}…${raw.slice(-150)}` : raw;
    throw new Error(
      `Não consegui ler isso como JSON. Resposta recebida: "${snippet}"`,
    );
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Formato inesperado — esperava um objeto JSON.");
  }

  const obj = parsed as Record<string, unknown>;
  const suggestedAreasRaw = Array.isArray(obj.suggestedAreas) ? obj.suggestedAreas : [];

  const suggestedAreas: SuggestedArea[] = suggestedAreasRaw
    .map((entry): SuggestedArea | null => {
      const a = entry as {
        title?: unknown;
        description?: unknown;
        detail?: unknown;
        rationale?: unknown;
        actions?: unknown;
      };
      if (typeof a.title !== "string" || !a.title.trim()) return null;

      const actions: SuggestedAction[] = (Array.isArray(a.actions) ? a.actions : [])
        .map((entryAction): SuggestedAction | null => {
          const act = entryAction as { title?: unknown; kind?: unknown; description?: unknown };
          if (typeof act.title !== "string" || !act.title.trim()) return null;
          return {
            title: act.title.trim(),
            kind: typeof act.kind === "string" ? act.kind.trim() : undefined,
            description: typeof act.description === "string" ? act.description.trim() : undefined,
          };
        })
        .filter((act): act is SuggestedAction => act !== null);

      if (actions.length === 0) return null;

      // o Gemini às vezes usa `detail` em vez de `description` aqui (puxando
      // o nome do formato de strengths/improvements, que usa `detail` de
      // verdade) — aceita os dois pra não perder a descrição da área por
      // causa de inconsistência de nome de campo do modelo.
      const descriptionRaw = typeof a.description === "string" ? a.description : a.detail;
      return {
        title: a.title.trim(),
        description: typeof descriptionRaw === "string" ? descriptionRaw.trim() : undefined,
        rationale: typeof a.rationale === "string" ? a.rationale.trim() : undefined,
        actions,
      };
    })
    .filter((a): a is SuggestedArea => a !== null);

  return {
    strengths: asPointList(obj.strengths),
    improvements: asPointList(obj.improvements),
    suggestedAreas,
  };
}

type IncomingAreaInput = z.input<typeof incomingAreaSchema>;

/**
 * Converte uma área JÁ EXISTENTE de volta pro formato "de entrada" (rótulo em
 * português) — necessário porque `/api/import` espera o PDI INTEIRO (áreas
 * que sumirem do payload são podadas pelo merge), então uma área/ação nova
 * sugerida precisa viajar junto com as áreas já existentes, convertidas.
 */
/**
 * Todo campo opcional de `incomingActionSchema`/`incomingAreaSchema` aceita
 * "ausente" (`undefined`) mas nenhum aceita `null` (zod `.optional()` não é
 * `.nullable()`) — e string vazia também não conta como "ausente" nos campos
 * de texto (`.min(1)`). Dado antigo (de bugs já corrigidos na extração, ver
 * commits `d636767`/`4cc1cba`) pode ter ficado gravado no banco como `null`
 * ou `""` em vez de simplesmente não existir — qualquer um desses campos
 * (descrição, carga horária, unidades, prazo...) derrubava o payload
 * INTEIRO com "payload inválido" ao tentar reconverter uma área existente.
 * Em vez de corrigir campo por campo a cada erro novo (3 rodadas até aqui),
 * limpa de uma vez só: percorre o objeto inteiro e troca `null`/`""` por
 * `undefined` (que o `JSON.stringify` simplesmente omite).
 */
function cleanNulls<T>(value: T): T {
  if (value === null) return undefined as T;
  if (typeof value === "string") return (value.trim() === "" ? undefined : value) as T;
  if (Array.isArray(value)) return value.map(cleanNulls) as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = cleanNulls(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out as T;
  }
  return value;
}

export function areaToIncomingInput(area: Area): IncomingAreaInput {
  return cleanNulls({
    title: area.title,
    kind: AREA_KIND_LABEL[area.kind],
    description: area.description,
    actions: area.actions.map((a) => ({
      title: a.title,
      kind: ACTION_KIND_LABEL[a.kind],
      status: ACTION_STATUS_LABEL[a.status],
      dueDate: a.dueDate,
      description: a.description,
      estimatedHours: a.estimatedHours,
      unitsTotal: a.unitsTotal,
      unitsDone: a.unitsDone,
      unitsLabel: a.unitsLabel,
      hoursDone: a.hoursDone,
      completedAt: a.completedAt,
      certificateUrl: a.certificateUrl,
    })),
  });
}

/** Converte uma sugestão aceita pro mesmo formato de entrada, pronta pra juntar com `areaToIncomingInput`. */
export function suggestedAreaToIncomingInput(area: SuggestedArea): IncomingAreaInput {
  return cleanNulls({
    title: area.title,
    description: area.description,
    actions: area.actions.map((a) => ({
      title: a.title,
      kind: a.kind,
      description: a.description,
    })),
  });
}
