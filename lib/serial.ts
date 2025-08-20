import { Db } from 'mongodb';
export async function nextSeq(db: Db, key: string): Promise<number> {
  const res = await db.collection('counters').findOneAndUpdate(
    { _id: key }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' }
  );
  return (res.value?.seq as number) || 1;
}
