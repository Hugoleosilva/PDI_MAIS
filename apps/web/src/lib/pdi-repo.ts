import {
  appendSnapshot,
  buildSnapshot,
  deriveAreaStatus,
  mergePdi,
  type PdiCanvasState,
  type PdiDoc,
  type PdiGroup,
  type PdiLink,
  type ProgressSnapshot,
  type Source,
  type SyncPayload,
  type WeekCapacity,
} from "@pdi-mais/core";
import { getDb } from "./mongo";

const COLLECTION = "pdis";

async function collection() {
  const db = await getDb();
  return db.collection<PdiDoc>(COLLECTION);
}

export async function getPdiByUserId(userId: string): Promise<PdiDoc | null> {
  const col = await collection();
  return col.findOne({ userId }, { projection: { _id: 0 } });
}

/**
 * Aplica um payload de sync (extensão ou import manual) e devolve o documento
 * resultante. A lógica de merge vive em @pdi-mais/core e é testada lá.
 */
export async function applySync(
  userId: string,
  payload: SyncPayload,
  source: Source,
): Promise<PdiDoc> {
  const col = await collection();
  const existing = await col.findOne({ userId }, { projection: { _id: 0 } });
  const merged = mergePdi(existing, payload, { userId, source });
  await col.updateOne({ userId }, { $set: merged }, { upsert: true });
  return merged;
}

function nodeIdSet(doc: Pick<PdiDoc, "areas">): Set<string> {
  const ids = new Set<string>(["root"]);
  for (const area of doc.areas) {
    ids.add(area.id);
    for (const a of area.actions) ids.add(a.id);
  }
  return ids;
}

/** Cria uma conexão manual entre dois nós (valida que ambos existem). */
export async function addLink(
  userId: string,
  link: PdiLink,
): Promise<{ ok: boolean; error?: string }> {
  const col = await collection();
  const doc = await col.findOne({ userId }, { projection: { _id: 0, areas: 1 } });
  if (!doc) return { ok: false, error: "PDI não encontrado" };

  const ids = nodeIdSet(doc);
  if (link.source === link.target) return { ok: false, error: "origem igual ao destino" };
  if (!ids.has(link.source) || !ids.has(link.target)) {
    return { ok: false, error: "nó inexistente" };
  }

  // remove duplicata (mesma origem/destino) e insere
  await col.updateOne(
    { userId },
    { $pull: { links: { source: link.source, target: link.target } } },
  );
  await col.updateOne(
    { userId },
    { $push: { links: link }, $set: { updatedAt: new Date() } },
  );
  return { ok: true };
}

/** Remove uma conexão manual pelo id. */
export async function removeLink(userId: string, id: string): Promise<void> {
  const col = await collection();
  await col.updateOne(
    { userId },
    { $pull: { links: { id } }, $set: { updatedAt: new Date() } },
  );
}

/** Substitui a lista de blocos (o canvas manda a lista inteira). */
export async function setGroups(userId: string, groups: PdiGroup[]): Promise<void> {
  const col = await collection();
  await col.updateOne({ userId }, { $set: { groups, updatedAt: new Date() } });
}

/** Salva o estado visual do canvas (posições + frames manuais). */
export async function setCanvas(userId: string, canvas: PdiCanvasState): Promise<void> {
  const col = await collection();
  await col.updateOne({ userId }, { $set: { canvas, updatedAt: new Date() } });
}

/** Capacidade semanal para o que está fora de bloco. */
export async function setLooseCapacity(userId: string, cap: WeekCapacity): Promise<void> {
  const col = await collection();
  await col.updateOne({ userId }, { $set: { looseCapacity: cap, updatedAt: new Date() } });
}

/** Edita uma ação (status, prazo, descrição, campos de planejamento). */
export async function updateAction(
  userId: string,
  actionId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  const col = await collection();
  const doc = await col.findOne({ userId }, { projection: { _id: 0 } });
  if (!doc) return { ok: false };

  let hit: PdiDoc["areas"][number]["actions"][number] | undefined;
  let area: PdiDoc["areas"][number] | undefined;
  for (const ar of doc.areas) {
    const a = ar.actions.find((x) => x.id === actionId);
    if (a) {
      hit = a;
      area = ar;
      break;
    }
  }
  if (!hit || !area) return { ok: false };

  const target = hit as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v === null) delete target[k];
    else target[k] = v;
  }

  // completedAt segue o status
  const status = patch.status as string | undefined;
  if (status === "done" && !hit.completedAt) {
    hit.completedAt = new Date().toISOString().slice(0, 10);
  }
  if (status && status !== "done") delete hit.completedAt;

  hit.source = "manual"; // o usuário assumiu a ação
  area.status = deriveAreaStatus(area.actions);

  await col.updateOne(
    { userId },
    { $set: { areas: doc.areas, updatedAt: new Date() } },
  );
  return { ok: true };
}

/** Edita campos do nó raiz (title / track). `track: null` remove a trilha. */
export async function updateRoot(
  userId: string,
  patch: { title?: string; track?: string | null },
): Promise<void> {
  const col = await collection();
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  const $unset: Record<string, unknown> = {};
  if (patch.title !== undefined) $set["root.title"] = patch.title;
  if (patch.track === null) $unset["root.track"] = "";
  else if (patch.track !== undefined) $set["root.track"] = patch.track;

  const update: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) update.$unset = $unset;
  await col.updateOne({ userId }, update);
}

/**
 * Gera um relatório (fotografia do andamento atual) e anexa ao histórico.
 * Devolve o snapshot criado — o cliente só precisa acrescentar na lista local.
 */
export async function addReportSnapshot(userId: string): Promise<ProgressSnapshot | null> {
  const col = await collection();
  const doc = await col.findOne({ userId }, { projection: { _id: 0 } });
  if (!doc) return null;

  const snapshot = buildSnapshot(doc);
  const reports = appendSnapshot(doc.reports, snapshot);
  await col.updateOne({ userId }, { $set: { reports, updatedAt: new Date() } });
  return snapshot;
}

/**
 * Cria os índices da coleção. Idempotente — pode rodar sempre.
 * Chame uma vez (ex.: script de setup) ou deixe o Atlas criar via UI.
 */
export async function ensureIndexes(): Promise<void> {
  const col = await collection();
  await col.createIndex({ userId: 1 }, { unique: true });
  await col.createIndex({ shareId: 1 }, { unique: true, sparse: true });
}
