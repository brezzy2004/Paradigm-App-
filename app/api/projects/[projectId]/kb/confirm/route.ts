export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyJwt } from '@/lib/jwt';
import { headObject, BUCKET } from '@/lib/s3';
import { releaseProjectUploadLock } from '@/lib/locks';
import { assertProjectRole } from '@/lib/guards';
import { audit } from '@/lib/audit';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

const Dto = z.object({ objectKey: z.string().min(1), title: z.string().min(1), mimeType: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(auth);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await assertProjectRole(user.sub, params.projectId, 'MEMBER');

  const body = await req.json();
  const parsed = Dto.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const db = await getDb();
  const project = await db.collection('projects').findOne({ _id: new ObjectId(params.projectId) });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  try {
    const head = await headObject(parsed.data.objectKey);
    const sizeBytes = Number(head.ContentLength ?? 0);

    const doc = {
      projectId: project._id,
      title: parsed.data.title,
      storageUrl: `s3://${BUCKET}/${parsed.data.objectKey}`,
      mimeType: parsed.data.mimeType,
      sizeBytes,
      createdByUserId: new ObjectId(user.sub),
      createdAt: new Date()
    };

    const ins = await db.collection('kb_documents').insertOne(doc);
    await releaseProjectUploadLock(params.projectId);
    await audit('kb.confirm', { userId: user.sub, targetType: 'project', targetId: params.projectId, meta: { kbId: String(ins.insertedId) } });

    return NextResponse.json({ kb: { id: String(ins.insertedId), ...doc } });
  } catch (e: any) {
    await releaseProjectUploadLock(params.projectId).catch(() => {});
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
