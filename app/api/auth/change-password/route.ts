export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { verifyJwt } from '@/lib/jwt';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<any>(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const db = await getDb();
  const u = await db.collection('users').findOne({ _id: new ObjectId(user.sub) });
  if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const ok = await bcrypt.compare(currentPassword, u.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.collection('users').updateOne({ _id: u._id }, { $set: { passwordHash } });
  return NextResponse.json({ ok: true });
}
