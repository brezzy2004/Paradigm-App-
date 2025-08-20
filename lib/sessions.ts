import crypto from 'crypto';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, refreshToken: string, ttlMs: number) {
  const db = await getDb();
  await db.collection('sessions').insertOne({
    userId: new ObjectId(userId),
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + ttlMs),
    createdAt: new Date()
  });
}

export async function findSession(refreshToken: string) {
  const db = await getDb();
  return db.collection('sessions').findOne({
    tokenHash: hashToken(refreshToken),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  });
}

export async function revokeSession(refreshToken: string) {
  const db = await getDb();
  await db.collection('sessions').updateOne(
    { tokenHash: hashToken(refreshToken) },
    { $set: { revokedAt: new Date() } }
  );
}
