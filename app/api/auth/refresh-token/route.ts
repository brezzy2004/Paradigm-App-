export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/jwt';
import { findSession, revokeSession, createSession } from '@/lib/sessions';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  const { refreshToken } = await req.json();
  if (!refreshToken) return NextResponse.json({ error: 'Missing refreshToken' }, { status: 400 });

  const session = await findSession(refreshToken);
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  // Rotate
  await revokeSession(refreshToken);
  const newRefresh = randomUUID();
  await createSession(String(session.userId), newRefresh, 1000 * 60 * 60 * 24 * 7);

  // Fetch user to include email/role
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(String(session.userId)) });
  const accessToken = signJwt({ sub: String(session.userId), email: user?.email, role: user?.role });

  return NextResponse.json({ accessToken, refreshToken: newRefresh });
}
