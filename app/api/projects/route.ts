export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { getDb } from '@/lib/mongodb';
import { CreateProjectDto } from '@/lib/validators';
import { nextSeq } from '@/lib/serial';
import { assertGroupRole } from '@/lib/guards';
import { audit } from '@/lib/audit';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`rl:create_project:${user.sub}`, 30, 3600);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const payload = await req.json();
  const parsed = CreateProjectDto.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  await assertGroupRole(user.sub, parsed.data.developerGroupId, "MEMBER");

  const db = await getDb();
  const serial = await nextSeq(db, 'projects');
  const project = {
    developerGroupId: new ObjectId(parsed.data.developerGroupId),
    name: parsed.data.name,
    createdByUserId: new ObjectId(user.sub),
    createdAt: new Date(),
    serial
  };
  const ins = await db.collection('projects').insertOne(project);
  await audit('project.create', { userId: user.sub, targetType: 'project', targetId: String(ins.insertedId), meta: { ip } });
  return NextResponse.json({ project: { id: String(ins.insertedId), ...project } });
}


export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const developerGroupId = searchParams.get('developerGroupId');
  if (!developerGroupId) return NextResponse.json({ error: 'developerGroupId required' }, { status: 400 });

  // Ensure membership
  await assertGroupRole(user.sub, developerGroupId, 'MEMBER');

  const db = await getDb();
  const projects = await db.collection('projects').find({ developerGroupId: new ObjectId(developerGroupId) }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ projects: projects.map(p => ({ id: String(p._id), name: p.name, createdAt: p.createdAt })) });
}
