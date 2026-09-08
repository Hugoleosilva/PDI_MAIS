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

/**
 * Cria os índices da coleção. Idempotente — pode rodar sempre.
 * Chame uma vez (ex.: script de setup) ou deixe o Atlas criar via UI.
 */
export async function ensureIndexes(): Promise<void> {
  const col = await collection();
  await col.createIndex({ userId: 1 }, { unique: true });
  await col.createIndex({ shareId: 1 }, { unique: true, sparse: true });
}
