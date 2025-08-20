export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { LoginDto } from '@/lib/validators';
import bcrypt from 'bcrypt';
import { getClientIp } from '@/lib/ip';
import { rateLimit } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`rl:register:${ip}`, 5, 300);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many attempts. Try later.' }, { status: 429 });

  const body = await req.json();
  const parsed = LoginDto.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const db = await getDb();
  const exist = await db.collection('users').findOne({ email: parsed.data.email });
  if (exist) return NextResponse.json({ error: 'Email already used' }, { status: 409 });

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const res = await db.collection('users').insertOne({ email: parsed.data.email, passwordHash: hash, role: 'ADMIN', createdAt: new Date() });

  await audit('auth.register', { userId: String(res.insertedId), targetType: 'user', targetId: String(res.insertedId), meta: { ip } });
  return NextResponse.json({ id: String(res.insertedId) });
}
