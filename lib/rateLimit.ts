import { redis } from './redis';
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const now = Math.floor(Date.now()/1000);
  const windowKey = `${key}:${Math.floor(now / windowSec)}`;
  const count = await redis.incr(windowKey);
  if (count === 1) await redis.expire(windowKey, windowSec + 1);
  return { allowed: count <= limit, count, limit, resetIn: windowSec - (now % windowSec) };
}
