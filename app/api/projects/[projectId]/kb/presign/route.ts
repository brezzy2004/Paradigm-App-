export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyJwt } from '@/lib/jwt';
import { isProjectUploadLocked, acquireProjectUploadLock } from '@/lib/locks';
import { presignPut, BUCKET } from '@/lib/s3';
import crypto from 'node:crypto';
import { assertProjectRole } from '@/lib/guards';
import { audit } from '@/lib/audit';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(auth);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`rl:kb_presign:${user.sub}:${params.projectId}`, 20, 300);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  await assertProjectRole(user.sub, params.projectId, 'MEMBER');

  const db = await getDb();
  const project = await db.collection('projects').findOne({ _id: new ObjectId(params.projectId) });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  if (await isProjectUploadLocked(params.projectId)) return NextResponse.json({ error: 'Project is locked due to another KB upload in progress' }, { status: 423 });
  const got = await acquireProjectUploadLock(params.projectId);
  if (!got) return NextResponse.json({ error: 'Project is locked due to another KB upload in progress' }, { status: 423 });

  const body = await req.json();
  const urlSafeName = (body?.fileName || `kb-${crypto.randomUUID()}.bin`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectKey = `kb/${params.projectId}/${crypto.randomUUID()}-${urlSafeName}`;
  const uploadUrl = await presignPut(objectKey, 'application/octet-stream');

  await audit('kb.presign', { userId: user.sub, targetType: 'project', targetId: params.projectId, meta: { ip, objectKey } });
  return NextResponse.json({ bucket: BUCKET, objectKey, uploadUrl });
}
