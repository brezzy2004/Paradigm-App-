export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/lib/mongodb';
import { signJwt } from '@/lib/jwt';
import { createSession } from '@/lib/sessions';
import { randomUUID } from 'crypto';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { ObjectId } from 'mongodb';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email/password' }, { status: 400 });
  }

  // Basic IP rate-limit
  const rl = await rateLimit(`rl:login:ip:${getClientIp(req.headers)}`, 10, 60);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const db = await getDb();
  const user = await db.collection('users').findOne({ email });

  // Unknown user: dummy hash compare to reduce timing signal, but still rate-limit
  const dummyHash = '$2b$10$C6UzMDM.H6dfI/f/IKcEeO5yQw2N1T0EcS8Z6FQJrYczr0iU2Cdee'; // "password" bcrypt
  const passwordHash = user?.passwordHash || dummyHash;

  // Account lockout check
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json({ error: 'Account locked. Try again later.' }, { status: 423 });
  }

  const ok = await bcrypt.compare(password, passwordHash);
  if (!user || !ok) {
    // Increment fail counter and lock if needed
    if (user) {
      const fails = (user.failedLogins || 0) + 1;
      const update: any = { failedLogins: fails, lastFailedLoginAt: new Date() };
      if (fails >= MAX_FAILED) {
        update.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        update.failedLogins = 0;
      }
      await db.collection('users').updateOne({ _id: new ObjectId(user._id) }, { $set: update });
    }
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  }

  // Reset fail counters on success
  await db.collection('users').updateOne({ _id: new ObjectId(user._id) }, { $set: { failedLogins: 0, lockedUntil: null } });

  const accessToken = signJwt({ sub: String(user._id), email: user.email, role: user.role });
  const refreshToken = randomUUID();
  await createSession(String(user._id), refreshToken, 1000 * 60 * 60 * 24 * 7);

  return NextResponse.json({
    accessToken,
    refreshToken,
    user: { id: String(user._id), email: user.email, role: user.role }
  });
}
