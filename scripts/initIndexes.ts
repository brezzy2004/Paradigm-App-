// scripts/initIndexes.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// import after dotenv
const { getDb } = await import('../lib/mongodb');
const { ensureIndexes } = await import('../models/indexes');

// 👇 Type the counters collection so _id is a string
type CounterDoc = { _id: string; seq: number };

async function main() {
  const db = await getDb();
  await ensureIndexes();

  const counters = db.collection<CounterDoc>('counters');

  await counters.updateOne(
    { _id: 'projects' },
    { $setOnInsert: { seq: 0 } },
    { upsert: true }
  );

  await counters.updateOne(
    { _id: 'chats' },
    { $setOnInsert: { seq: 0 } },
    { upsert: true }
  );

  console.log('Indexes and counters initialized');
}
main().catch((e) => { console.error(e); process.exit(1); });
