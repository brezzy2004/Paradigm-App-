export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyJwt } from '@/lib/jwt';
import { z } from 'zod';
import { assertChatRole } from '@/lib/guards';
import { audit } from '@/lib/audit';
import { ObjectId } from 'mongodb';

const Dto = z.object({ kbId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { chatId: string } }) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(auth);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = Dto.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { chat } = await assertChatRole(user.sub, params.chatId, 'MEMBER');
  if (chat.type !== 'project') return NextResponse.json({ error: 'Group chats cannot select a Knowledge Base' }, { status: 400 });
  if (chat.firstMessageAt) return NextResponse.json({ error: 'Cannot change KB after first message is sent' }, { status: 400 });

  const db = await getDb();
  const kb = await db.collection('kb_documents').findOne({ _id: new ObjectId(parsed.data.kbId) });
  if (!kb) return NextResponse.json({ error: 'KB not found' }, { status: 404 });
  if (String(kb.projectId) !== String(chat.projectId)) return NextResponse.json({ error: 'Selected KB must belong to the same project as the chat' }, { status: 400 });

  await db.collection('chats').updateOne({ _id: new ObjectId(params.chatId), firstMessageAt: null }, { $set: { kbId: kb._id } });
  await audit('chat.kb.set', { userId: user.sub, targetType: 'chat', targetId: params.chatId, meta: { kbId: parsed.data.kbId } });
  const updated = await db.collection('chats').findOne({ _id: new ObjectId(params.chatId) });
  return NextResponse.json({ chat: { id: String(updated!._id), kbId: String(updated!.kbId) } });
}
