export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { PresignDto } from '@/lib/validators';
import { presignPut, BUCKET } from '@/lib/s3';
import crypto from 'node:crypto';
import { assertChatRole } from '@/lib/guards';
import { audit } from '@/lib/audit';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';

export async function POST(req: NextRequest, { params }: { params: { chatId: string } }) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(auth);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await assertChatRole(user.sub, params.chatId, 'MEMBER');

  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`rl:presign:${user.sub}:${params.chatId}`, 30, 60);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const body = await req.json();
  const parsed = PresignDto.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const safe = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectKey = `chat_files/${params.chatId}/${crypto.randomUUID()}-${safe}`;
  const uploadUrl = await presignPut(objectKey, parsed.data.contentType);

  await audit('file.presign', { userId: user.sub, targetType: 'chat', targetId: params.chatId, meta: { ip, objectKey } });
  return NextResponse.json({ bucket: BUCKET, objectKey, uploadUrl });
}
