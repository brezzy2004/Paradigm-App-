export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { assertProjectRole } from '@/lib/guards';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await assertProjectRole(user.sub, params.projectId, 'MEMBER');

  const db = await getDb();
  const project = await db.collection('projects').findOne({ _id: new ObjectId(params.projectId) });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const kb = await db.collection('kb_documents').find({ projectId: project._id })
    .project({ _id: 1, title: 1, storageUrl: 1, mimeType: 1, sizeBytes: 1, createdAt: 1 })
    .toArray();

  // Optional: last 20 messages from latest project chat(s)
  const chats = await db.collection('chats').find({ projectId: project._id })
    .project({ _id: 1, displayId: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();

  const messages = await db.collection('chat_messages')
    .find({ chatId: { $in: chats.map(c => c._id) } })
    .sort({ createdAt: -1 })
    .limit(20)
    .project({ _id: 0, chatId: 1, body: 1, createdAt: 1 })
    .toArray();

  return NextResponse.json({
    project: { id: String(project._id), name: project.name, createdAt: project.createdAt, serial: project.serial },
    knowledgeBase: kb.map(d => ({ id: String(d._id), title: d.title, url: d.storageUrl, mimeType: d.mimeType, sizeBytes: d.sizeBytes })),
    recentChats: chats.map(c => ({ id: String(c._id), displayId: c.displayId, createdAt: c.createdAt })),
    recentMessages: messages.map(m => ({ chatId: String(m.chatId), body: m.body, createdAt: m.createdAt }))
  });
}
