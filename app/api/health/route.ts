export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { redis } from '@/lib/redis';
import { s3, BUCKET, headObject } from '@/lib/s3';

export async function GET() {
  const result: any = { ok: true, checks: {} };
  try {
    const db = await getDb();
    // minimal round-trip to Mongo
    await db.command({ ping: 1 });
    result.checks.mongo = true;
  } catch (e: any) {
    result.ok = false;
    result.checks.mongo = false;
    result.checks.mongoError = e.message;
  }
  try {
    await redis.ping();
    result.checks.redis = true;
  } catch (e: any) {
    result.ok = false;
    result.checks.redis = false;
    result.checks.redisError = e.message;
  }
  try {
    // no-op S3 call: attempt to head a non-existent key, expect a 404-style error (which proves connectivity/credentials)
    await headObject('__healthcheck__never_exists__');
    // If it does not throw, we still consider connectivity fine
    result.checks.objectStore = true;
  } catch (e: any) {
    const msg = String(e?.name || e?.message || e);
    // NotFound is fine — indicates we reached the server
    result.checks.objectStore = /NotFound|NoSuchKey|Not Found/i.test(msg);
    if (!result.checks.objectStore) {
      result.ok = false;
      result.checks.objectStoreError = msg;
    }
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
