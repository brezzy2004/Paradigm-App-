import { redis } from './redis';
const CHAT_TTL = 120;
export async function acquireChatLock(chatId: string, userId: string) {
  const ok = await redis.set(`lock:chat:${chatId}`, userId, 'NX', 'EX', CHAT_TTL);
  return ok === 'OK';
}
export async function releaseChatLock(chatId: string, userId?: string) {
  const key = `lock:chat:${chatId}`;
  if (userId) {
    const holder = await redis.get(key);
    if (holder !== userId) return;
  }
  await redis.del(key);
}
export function whoHoldsChatLock(chatId: string) {
  return redis.get(`lock:chat:${chatId}`);
}
export async function acquireProjectUploadLock(projectId: string, ttl = 900) {
  const ok = await redis.set(`lock:project_upload:${projectId}`, '1', 'NX', 'EX', ttl);
  return ok === 'OK';
}
export async function releaseProjectUploadLock(projectId: string) {
  await redis.del(`lock:project_upload:${projectId}`);
}
export async function isProjectUploadLocked(projectId: string) {
  return (await redis.exists(`lock:project_upload:${projectId}`)) === 1;
}
