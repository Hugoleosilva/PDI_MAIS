import { actionId, areaId, normalizeTitle } from "./ids";
import type { SyncPayload } from "./schema";
import type { Action, Area, PdiDoc, Source, Status } from "./types";

/**
 * Status da área derivado das ações:
 * - sem ações              => "todo"
 * - todas "done"           => "done"
 * - alguma "doing"         => "doing"
 * - mistura done + todo    => "doing"
 * - resto                  => "todo"
 */
export function deriveAreaStatus(actions: Action[]): Status {
  if (actions.length === 0) return "todo";
  if (actions.every((a) => a.status === "done")) return "done";
  if (actions.some((a) => a.status === "doing")) return "doing";
  if (actions.some((a) => a.status === "done")) return "doing";
  return "todo";
}

export interface MergeOptions {
  userId: string;
  source: Source;
  /** Injeta o "agora" nos testes. */
  now?: Date;
}

/**
 * Aplica um payload de sync sobre o documento existente.
 *
 * Garantias:
 * - Idempotente: rodar duas vezes com o mesmo payload dá o mesmo resultado
 *   (IDs determinísticos).
 * - Preserva edições locais: `layout` (posição no canvas) e `description` (de
 *   área e ação) nunca são apagados pelo sync.
 * - Ações com `source: "manual"` mantêm status e prazo do usuário; o sync só
 *   atualiza o título e o tipo.
 * - Áreas/ações que sumiram do payload NÃO aparecem no resultado (o PDI espelha
 *   a fonte). TODO(Rodada 5): preservar nós criados manualmente.
 */
export function mergePdi(
  existing: PdiDoc | null,
  payload: SyncPayload,
  opts: MergeOptions,
): PdiDoc {
  const now = opts.now ?? new Date();
  const prevAreas = new Map((existing?.areas ?? []).map((a) => [a.id, a]));

  // Duas áreas com o MESMO título (mesmo ignorando acento/caixa) geram o
  // mesmo ID determinístico — sem isso, elas brigam pelo mesmo nó no React
  // Flow (uma some da tela) e as contagens/setas ficam inconsistentes com o
  // que aparece. Desambigua a 2ª+ ocorrência dentro do MESMO payload, sem
  // apagar nenhuma — o usuário decide depois se era duplicata de verdade.
  const titleOccurrences = new Map<string, number>();
  const areas: Area[] = payload.areas.map((incomingArea, index) => {
    const normalized = normalizeTitle(incomingArea.title);
    const occurrence = titleOccurrences.get(normalized) ?? 0;
    titleOccurrences.set(normalized, occurrence + 1);
    // mesma desambiguação usada no ID da área — sem isso, as AÇÕES de duas
    // áreas com título repetido ainda colidiam entre si (actionId usa o
    // título da área como parte do hash), sumindo card de ação sem aviso.
    const areaTitleForHash =
      occurrence === 0 ? incomingArea.title : `${incomingArea.title} #${occurrence + 1}`;
    const id = areaId(areaTitleForHash);
    const prevArea = prevAreas.get(id);
    const prevActions = new Map(
      (prevArea?.actions ?? []).map((a) => [a.id, a]),
    );

    // Mesmo problema, um nível abaixo: duas ações com o MESMO título dentro
    // da MESMA área (duplicata real do usuário, ou uma extração que leu o
    // mesmo card duas vezes) geram o mesmo ID determinístico — sem
    // desambiguar, as duas colapsam numa só entrada com o MESMO id dentro do
    // array (não um merge, um literal duplicado), o que fazia o React Flow
    // acusar "two children with the same key" e deixar aresta solta no canvas.
    const actionTitleOccurrences = new Map<string, number>();
    const actions: Action[] = incomingArea.actions.map((incoming) => {
      const normalizedTitle = normalizeTitle(incoming.title);
      const actionOccurrence = actionTitleOccurrences.get(normalizedTitle) ?? 0;
      actionTitleOccurrences.set(normalizedTitle, actionOccurrence + 1);
      const actionTitleForHash =
        actionOccurrence === 0 ? incoming.title : `${incoming.title} #${actionOccurrence + 1}`;
      const aid = actionId(areaTitleForHash, actionTitleForHash);
      const prev = prevActions.get(aid);
      // Só protege status/prazo de uma ação manual contra um SYNC DA EXTENSÃO
      // (fonte não confiável tentando sobrescrever o que o usuário editou à
      // mão). Um payload que É ELE MESMO manual (ManualBuilder/"colar
      // tabela", ambos chamam applySync com source:"manual") é a edição do
      // usuário agora — precisa vencer, senão status/prazo travam pra sempre
      // depois do primeiro save manual (bug: toda reedição via "Preencher à
      // mão" era descartada silenciosamente).
      const protectManual = prev?.source === "manual" && opts.source === "extension";

      const status = protectManual && prev ? prev.status : incoming.status;
      return {
        id: aid,
        title: incoming.title,
        kind: incoming.kind,
        status,
        dueDate:
          protectManual && prev ? prev.dueDate : (incoming.dueDate ?? prev?.dueDate),
        // || (não ??): uma descrição salva como string VAZIA (bug de
        // extração, ou área sem texto na origem) não conta como "edição
        // manual que precisa ser protegida" — sem isso, um sync novo com
        // dado corrigido nunca substituía o "" que já tinha sido gravado.
        description: prev?.description || incoming.description,
        certificateUrl: prev?.certificateUrl ?? incoming.certificateUrl,
        source: prev?.source ?? opts.source,
        layout: prev?.layout,
        // planejamento: sempre preserva o que o usuário definiu; o import pode trazer
        estimatedHours: prev?.estimatedHours ?? incoming.estimatedHours,
        unitsTotal: prev?.unitsTotal ?? incoming.unitsTotal,
        unitsDone: prev?.unitsDone ?? incoming.unitsDone,
        unitsLabel: prev?.unitsLabel ?? incoming.unitsLabel,
        hoursDone: prev?.hoursDone ?? incoming.hoursDone,
        completedAt:
          prev?.completedAt ??
          (status === "done" ? now.toISOString().slice(0, 10) : undefined),
      };
    });

    return {
      id,
      title: incomingArea.title,
      kind: incomingArea.kind,
      status: deriveAreaStatus(actions),
      order: index,
      description: prevArea?.description || incomingArea.description,
      actions,
      layout: prevArea?.layout,
    };
  });

  // Conexões manuais: preserva as existentes, descartando as que apontam
  // para nós que sumiram do PDI.
  const nodeIds = new Set<string>(["root"]);
  for (const area of areas) {
    nodeIds.add(area.id);
    for (const a of area.actions) nodeIds.add(a.id);
  }
  // Anotações livres do canvas também são pontas válidas de conexão — sem
  // isso, toda seta ligada a uma anotação seria descartada a cada sync.
  for (const s of existing?.shapes ?? []) nodeIds.add(`shape-${s.id}`);
  const links = (existing?.links ?? []).filter(
    (l) => nodeIds.has(l.source) && nodeIds.has(l.target),
  );

  // Blocos: preserva, removendo referências a áreas que sumiram.
  const areaIds = new Set(areas.map((a) => a.id));
  const groups = (existing?.groups ?? []).map((g) => ({
    ...g,
    areaIds: g.areaIds.filter((id) => areaIds.has(id)),
  }));

  // Canvas: preserva posições de nós que ainda existem e frames de blocos vivos.
  const groupIds = new Set(groups.map((g) => g.id));
  const prevCanvas = existing?.canvas;
  const canvas: PdiDoc["canvas"] = prevCanvas
    ? {
        positions: Object.fromEntries(
          Object.entries(prevCanvas.positions ?? {}).filter(
            ([id]) => nodeIds.has(id),
          ),
        ),
        frames: Object.fromEntries(
          Object.entries(prevCanvas.frames ?? {}).filter(([id]) => groupIds.has(id)),
        ),
        ...(prevCanvas.rootSize ? { rootSize: prevCanvas.rootSize } : {}),
      }
    : undefined;

  return {
    userId: opts.userId,
    shareId: existing?.shareId ?? null,
    root: {
      title: payload.root.title,
      track: payload.root.track ?? existing?.root.track,
      note: existing?.root.note,
      noteTitle: existing?.root.noteTitle,
    },
    updatedAt: now,
    syncedAt: opts.source === "extension" ? now : (existing?.syncedAt ?? null),
    areas,
    links,
    groups,
    ...(canvas ? { canvas } : {}),
    ...(existing?.looseCapacity ? { looseCapacity: existing.looseCapacity } : {}),
    ...(existing?.reports?.length ? { reports: existing.reports } : {}),
    ...(existing?.canvasPresets?.length ? { canvasPresets: existing.canvasPresets } : {}),
    ...(existing?.shapes?.length ? { shapes: existing.shapes } : {}),
  };
}
