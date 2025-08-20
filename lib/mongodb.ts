import { MongoClient, Db } from 'mongodb';
const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB!;
type G = { _mongo?: { client: MongoClient, db: Db } };
const g = global as unknown as G;
export async function getDb(): Promise<Db> {
  if (g._mongo?.db) return g._mongo.db;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  g._mongo = { client, db };
  return db;
}
