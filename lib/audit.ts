import { ObjectId } from 'mongodb';
import { AuditLogs } from '@/models/collections';
export async function audit(action: string, opts: { userId?: string | null, targetType: string, targetId: string, meta?: Record<string, any> }) {
  const col = await AuditLogs();
  await col.insertOne({
    action,
    userId: opts.userId ? new ObjectId(opts.userId) : null,
    targetType: opts.targetType,
    targetId: opts.targetId,
    meta: opts.meta || {},
    createdAt: new Date()
  });
}
