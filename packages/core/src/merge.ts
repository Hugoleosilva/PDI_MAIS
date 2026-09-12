import { actionId, areaId } from "./ids";
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

  const areas: Area[] = payload.areas.map((incomingArea, index) => {
    const id = areaId(incomingArea.title);
    const prevArea = prevAreas.get(id);
    const prevActions = new Map(
      (prevArea?.actions ?? []).map((a) => [a.id, a]),
    );

    const actions: Action[] = incomingArea.actions.map((incoming) => {
      const aid = actionId(incomingArea.title, incoming.title);
      const prev = prevActions.get(aid);
      const isManual = prev?.source === "manual";

      const status = isManual && prev ? prev.status : incoming.status;
      return {
        id: aid,
        title: incoming.title,
        kind: incoming.kind,
        status,
        dueDate:
          isManual && prev ? prev.dueDate : (incoming.dueDate ?? prev?.dueDate),
        description: prev?.description ?? incoming.description,
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
      description: prevArea?.description ?? incomingArea.description,
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
  };
}
