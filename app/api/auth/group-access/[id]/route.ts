export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const me = verifyJwt<any>(token);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const mem = await db.collection('group_memberships').findOne({
    userId: new ObjectId(me.sub),
    developerGroupId: new ObjectId(params.id)
  });
  return NextResponse.json({ allowed: !!mem, role: mem?.role ?? null });
}
