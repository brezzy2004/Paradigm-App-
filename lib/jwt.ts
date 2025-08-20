import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
// NOTE: We keep verifyJwt() synchronous for backward compatibility (does NOT check blocklist).
// Use verifyJwtWithBlocklist() in new routes when you want blocklist enforcement.
import { redis } from '@/lib/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me';
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES || '15m';

export type JwtPayloadBase = {
  sub: string;
  email?: string;
  role?: string;
  jti?: string;
  exp?: number;
  iat?: number;
};

export function signJwt(payload: Record<string, any>) {
  const jti = randomUUID();
  return jwt.sign({ ...payload, jti }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function verifyJwt<T = JwtPayloadBase>(token?: string): T | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as T;
    return decoded;
  } catch {
    return null;
  }
}

export async function verifyJwtWithBlocklist<T = JwtPayloadBase>(token?: string): Promise<T | null> {
  const payload = verifyJwt<T>(token);
  if (!payload) return null as any;
  const anyPayload: any = payload;
  if (anyPayload?.jti) {
    const blocked = await redis.get(`jwt:block:${anyPayload.jti}`);
    if (blocked) return null as any;
  }
  return payload;
}
