export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyJwt } from '@/lib/jwt';
import { CreateChatDto } from '@/lib/validators';
import { nextSeq } from '@/lib/serial';
import { chatDisplayId, initialsFromEmail } from '@/lib/ids';
import { assertGroupRole, assertProjectRole } from '@/lib/guards';
import { audit } from '@/lib/audit';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string, email: string }>(auth);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`rl:create_chat:${user.sub}`, 60, 3600);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const payload = await req.json();
  const parsed = CreateChatDto.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const db = await getDb();
  const { type, developerGroupId, projectId, kbId } = parsed.data;

  if (type === 'group') {
    if (projectId) return NextResponse.json({ error: 'Group chat cannot belong to a project' }, { status: 400 });
    await assertGroupRole(user.sub, developerGroupId, 'MEMBER');
  } else {
    if (!projectId) return NextResponse.json({ error: 'Project chat requires projectId' }, { status: 400 });
    await assertProjectRole(user.sub, projectId, 'MEMBER');
  }

  let projectSerial: number | undefined = undefined;
  if (projectId) {
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    projectSerial = project.serial;
    if (kbId) {
      const kb = await db.collection('kb_documents').findOne({ _id: new ObjectId(kbId) });
      if (!kb || String(kb.projectId) !== String(project._id)) {
        return NextResponse.json({ error: 'KB must belong to same project' }, { status: 400 });
      }
    }
  } else if (kbId) {
    return NextResponse.json({ error: 'Group chats cannot select a Knowledge Base' }, { status: 400 });
  }

  const serial = await nextSeq(db, 'chats');
  const group = await db.collection('developer_groups').findOne({ _id: new ObjectId(developerGroupId) });
  if (!group) return NextResponse.json({ error: 'Developer group not found' }, { status: 404 });

  const displayId = chatDisplayId(serial, {
    projectSerial,
    groupSerial: group.serial || 1,
    userInitials: initialsFromEmail(user.email)
  });

  const doc = {
    type,
    developerGroupId: new ObjectId(developerGroupId),
    projectId: projectId ? new ObjectId(projectId) : null,
    createdByUserId: new ObjectId(user.sub),
    kbId: kbId ? new ObjectId(kbId) : null,
    kbLockedAt: null,
    firstMessageAt: null,
    createdAt: new Date(),
    serial,
    displayId
  };

  const ins = await db.collection('chats').insertOne(doc);
  await audit('chat.create', { userId: user.sub, targetType: 'chat', targetId: String(ins.insertedId), meta: { ip } });
  return NextResponse.json({ chat: { id: String(ins.insertedId), ...doc } });
}
