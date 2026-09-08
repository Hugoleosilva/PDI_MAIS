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
 * - Preserva edições locais: `layout` (posição no canvas), `description` e
 *   `root.note` nunca são apagados pelo sync.
 * - Ações com `source: "manual"` mantêm status e prazo do usuário; o sync só
 *   atualiza o título.
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

      return {
        id: aid,
        title: incoming.title,
        status: isManual && prev ? prev.status : incoming.status,
        dueDate: isManual && prev ? prev.dueDate : (incoming.dueDate ?? prev?.dueDate),
        description: prev?.description ?? incoming.description,
        source: prev?.source ?? opts.source,
        layout: prev?.layout,
      };
    });

    return {
      id,
      title: incomingArea.title,
      status: deriveAreaStatus(actions),
      order: index,
      actions,
      layout: prevArea?.layout,
    };
  });

  return {
    userId: opts.userId,
    shareId: existing?.shareId ?? null,
    root: {
      title: payload.root.title,
      note: existing?.root.note ?? payload.root.note,
    },
    updatedAt: now,
    syncedAt: opts.source === "extension" ? now : (existing?.syncedAt ?? null),
    areas,
  };
}
