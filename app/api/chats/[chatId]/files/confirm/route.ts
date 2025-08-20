export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { ConfirmUploadDto } from '@/lib/validators';
import { headObject, BUCKET } from '@/lib/s3';
import { assertChatRole } from '@/lib/guards';
import { audit } from '@/lib/audit';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('pdf')) return 'pdf';
  if (m.includes('png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('word')) return 'docx';
  if (m.includes('plain')) return 'txt';
  return 'bin';
}

export async function POST(req: NextRequest, { params }: { params: { chatId: string } }) {
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = verifyJwt<{ sub: string }>(auth);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = ConfirmUploadDto.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // Ensure uploader belongs to chat
  const { chat } = await assertChatRole(user.sub, params.chatId, 'MEMBER');

  // Verify object exists in object store and get size
  try { await headObject(parsed.data.objectKey); } catch (e: any) {
    return NextResponse.json({ error: 'Object not found in storage' }, { status: 400 });
  }
  const sizeBytes = 0; // MinIO HEAD may not return size in our client; keep 0 or extend later

  // Compute system ID (inherits chat serial and scope)
  const kind = extFromMime(parsed.data.mimeType);
  const scope = chat.projectId ? `PRJ-${chat.projectSerial}/DGP-${chat.groupSerial}` : `DGP-${chat.groupSerial}`;
  // If serials not stored, fall back to displayId parsing
  const display = chat.displayId as string;
  let id = '';
  if (display?.startsWith('cha-')) {
    const parts = display.split('/');
    const chatSerial = parts[0].slice(4);
    const scopePart = parts.slice(1, -1).join('/'); // PRJ-../DGP-.. or DGP-..
    id = `fil-${kind}-${chatSerial}/${scopePart}/${parts.at(-1)}`;
  } else {
    id = `fil-${kind}-${chat.serial || 'X'}/DGP-${chat.developerGroupSerial || 'X'}`;
  }

  const db = await getDb();
  const file = {
    chatId: new ObjectId(params.chatId),
    uploadedByUserId: new ObjectId(user.sub),
    storageUrl: `s3://${BUCKET}/${parsed.data.objectKey}`,
    mimeType: parsed.data.mimeType,
    sizeBytes,
    systemIdHint: id,
    createdAt: new Date()
  };
  await db.collection('files').insertOne(file);

  await audit('file.confirm', { userId: user.sub, targetType: 'chat', targetId: params.chatId, meta: { objectKey: parsed.data.objectKey, systemId: id } });
  return NextResponse.json({ file });
}
