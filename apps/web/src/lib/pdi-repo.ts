import { mergePdi, type PdiDoc, type Source, type SyncPayload } from "@pdi-mais/core";
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
