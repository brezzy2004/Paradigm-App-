export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtWithBlocklist } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const payload = await verifyJwtWithBlocklist<any>(token);
  if (!payload) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, user: { id: payload.sub, email: payload.email, role: payload.role }, exp: payload.exp });
}
