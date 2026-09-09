import {
  mergePdi,
  type PdiDoc,
  type PdiLink,
  type Source,
  type SyncPayload,
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
 * Cria os índices da coleção. Idempotente — pode rodar sempre.
 * Chame uma vez (ex.: script de setup) ou deixe o Atlas criar via UI.
 */
export async function ensureIndexes(): Promise<void> {
  const col = await collection();
  await col.createIndex({ userId: 1 }, { unique: true });
  await col.createIndex({ shareId: 1 }, { unique: true, sparse: true });
}
