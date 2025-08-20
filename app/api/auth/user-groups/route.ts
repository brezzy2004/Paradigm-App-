export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const me = verifyJwt<any>(token);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const m = await db.collection('group_memberships').find({ userId: new ObjectId(me.sub) }).toArray();
  const ids = m.map(x => x.developerGroupId);
  const groups = await db.collection('developer_groups').find({ _id: { $in: ids } }).toArray();

  const result = m.map(mem => {
    const g = groups.find(gg => String(gg._id) === String(mem.developerGroupId));
    return { id: String(mem.developerGroupId), name: g?.name, role: mem.role };
  });
  return NextResponse.json({ groups: result });
}
