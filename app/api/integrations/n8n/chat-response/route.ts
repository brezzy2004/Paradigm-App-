export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyJwt } from '@/lib/jwt';
import { assertChatRole } from '@/lib/guards';
import { audit } from '@/lib/audit';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  // n8n should use a technical user token you issue
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const svc = verifyJwt<{ sub: string }>(token);
  if (!svc) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  const { chatId, text, messageId } = payload || {};
  if (!chatId || !text) return NextResponse.json({ error: 'chatId and text required' }, { status: 400 });

  // Ensure this technical user has access to the chat's group
  await assertChatRole(svc.sub, chatId, 'MEMBER');

  const db = await getDb();

  // Idempotency: avoid duplicate inserts if messageId already exists
  if (messageId) {
    const dup = await db.collection('chat_messages').findOne({ 'meta.messageId': messageId, chatId: new ObjectId(chatId) });
    if (dup) return NextResponse.json({ message: dup });
  }

  const msg = {
    chatId: new ObjectId(chatId),
    userId: new ObjectId(svc.sub), // or a special "system" user
    body: String(text),
    meta: { from: 'n8n', messageId: messageId || null },
    createdAt: new Date()
  };
  await db.collection('chat_messages').insertOne(msg);
  await audit('message.create.n8n', { userId: svc.sub, targetType: 'chat', targetId: chatId });

  return NextResponse.json({ message: msg });
}
