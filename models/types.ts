import { z } from 'zod';
import { ObjectId } from 'mongodb';
export const oid = () => z.string().min(1).transform((v)=> new ObjectId(v));
export const oidRaw = z.instanceof(ObjectId);

export const UserZ = z.object({ _id: oidRaw.optional(), email: z.string().email(), passwordHash: z.string(), role: z.enum(['ADMIN','MEMBER']), createdAt: z.date() });
export type User = z.infer<typeof UserZ>;

export const DeveloperGroupZ = z.object({ _id: oidRaw.optional(), name: z.string().min(1), createdAt: z.date(), serial: z.number().int().positive() });
export type DeveloperGroup = z.infer<typeof DeveloperGroupZ>;

export const GroupMembershipZ = z.object({ _id: oidRaw.optional(), userId: oidRaw, developerGroupId: oidRaw, role: z.enum(['OWNER','ADMIN','MEMBER']) });
export type GroupMembership = z.infer<typeof GroupMembershipZ>;

export const ProjectZ = z.object({ _id: oidRaw.optional(), developerGroupId: oidRaw, name: z.string().min(1), createdByUserId: oidRaw, createdAt: z.date(), serial: z.number().int().positive() });
export type Project = z.infer<typeof ProjectZ>;

export const KbDocumentZ = z.object({ _id: oidRaw.optional(), projectId: oidRaw, title: z.string().min(1), storageUrl: z.string().min(1), mimeType: z.string().min(1), sizeBytes: z.number().nonnegative(), createdByUserId: oidRaw, createdAt: z.date() });
export type KbDocument = z.infer<typeof KbDocumentZ>;

export const ChatZ = z.object({ _id: oidRaw.optional(), type: z.enum(['group','project']), developerGroupId: oidRaw, projectId: oidRaw.nullable(), createdByUserId: oidRaw, kbId: oidRaw.nullable(), kbLockedAt: z.date().nullable(), firstMessageAt: z.date().nullable(), createdAt: z.date(), serial: z.number().int().positive(), displayId: z.string().min(1) });
export type Chat = z.infer<typeof ChatZ>;

export const ChatMessageZ = z.object({ _id: oidRaw.optional(), chatId: oidRaw, userId: oidRaw, body: z.string().min(1), createdAt: z.date() });
export type ChatMessage = z.infer<typeof ChatMessageZ>;

export const FileZ = z.object({ _id: oidRaw.optional(), chatId: oidRaw, uploadedByUserId: oidRaw, storageUrl: z.string().min(1), mimeType: z.string().min(1), sizeBytes: z.number().nonnegative(), systemIdHint: z.string().optional(), createdAt: z.date() });
export type FileDoc = z.infer<typeof FileZ>;

export const AuditLogZ = z.object({ _id: oidRaw.optional(), action: z.string().min(1), userId: oidRaw.nullable(), targetType: z.string().min(1), targetId: z.string().min(1), meta: z.record(z.any()).optional(), createdAt: z.date() });
export type AuditLog = z.infer<typeof AuditLogZ>;
