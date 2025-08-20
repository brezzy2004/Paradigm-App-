export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyJwt } from '@/lib/jwt';
import { MessageDto } from '@/lib/validators';
import { acquireChatLock, releaseChatLock, whoHoldsChatLock } from '@/lib/locks';
import { assertChatRole } from '@/lib/guards';
import { audit } from '@/lib/audit';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest, { params }: { params: { chatId: string } }) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(auth);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`rl:msg:${user.sub}:${params.chatId}`, 60, 60);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const body = await req.json();
  const parsed = MessageDto.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  await assertChatRole(user.sub, params.chatId, 'MEMBER');

  const db = await getDb();
  const chat = await db.collection('chats').findOne({ _id: new ObjectId(params.chatId) });
  if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

  const ok = await acquireChatLock(params.chatId, user.sub);
  if (!ok) {
    const holder = await whoHoldsChatLock(params.chatId);
    return NextResponse.json({ error: `Chat locked by ${holder} (~2m)` }, { status: 423 });
  }

  try {
    const msg = { chatId: chat._id, userId: new ObjectId(user.sub), body: parsed.data.body, createdAt: new Date() };
    await db.collection('chat_messages').insertOne(msg);

    if (!chat.firstMessageAt) {
      await db.collection('chats').updateOne(
        { _id: chat._id, firstMessageAt: null },
        { $set: { firstMessageAt: msg.createdAt, kbLockedAt: chat.kbId ? msg.createdAt : null } }
      );
    }

    await audit('message.create', { userId: user.sub, targetType: 'chat', targetId: String(chat._id), meta: { ip } });
    await releaseChatLock(params.chatId, user.sub);
    return NextResponse.json({ message: msg });
  } catch (e: any) {
    await releaseChatLock(params.chatId, user.sub).catch(() => {});
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(auth);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await assertChatRole(user.sub, params.chatId, 'MEMBER');

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const before = searchParams.get('before'); // ISO date or message id not implemented
  const db = await getDb();
  const q: any = { chatId: new ObjectId(params.chatId) };
  if (before) q.createdAt = { $lt: new Date(before) };

  const messages = await db.collection('chat_messages').find(q).sort({ createdAt: -1 }).limit(limit).toArray();
  return NextResponse.json({ messages });
}
