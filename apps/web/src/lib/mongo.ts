import { MongoClient, type Db } from "mongodb";

const dbName = process.env.MONGODB_DB ?? "pdi_mais";

declare global {
  // eslint-disable-next-line no-var
  var _pdiMongoClient: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI não definida — configure apps/web/.env.local");
  }
  return new MongoClient(uri).connect();
}

/**
 * Um cliente por processo. Em dev, o hot-reload recria os módulos várias vezes;
 * guardar a promise em `global` evita abrir dezenas de conexões no Atlas.
 */
function clientPromise(): Promise<MongoClient> {
  if (!global._pdiMongoClient) {
    global._pdiMongoClient = connect();
  }
  return global._pdiMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(dbName);
}
