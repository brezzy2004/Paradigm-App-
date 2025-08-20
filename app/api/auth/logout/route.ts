export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { revokeSession } from '@/lib/sessions';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const payload = verifyJwt<any>(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const nowSec = Math.floor(Date.now()/1000);
  const exp = payload.exp ?? (nowSec + 900);
  const ttl = Math.max(1, exp - nowSec);
  if (payload.jti) {
    await redis.setex(`jwt:block:${payload.jti}`, ttl, '1');
  }

  const body = await req.json().catch(() => ({} as any));
  if (body?.refreshToken) {
    await revokeSession(body.refreshToken);
  }

  return NextResponse.json({ ok: true });
}
