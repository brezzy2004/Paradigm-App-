import { getDb } from '@/lib/mongodb';
import type { Collection } from 'mongodb';
import { User, DeveloperGroup, GroupMembership, Project, KbDocument, Chat, ChatMessage, FileDoc, AuditLog } from './types';
export async function Users(): Promise<Collection<User>> { return (await getDb()).collection<User>('users'); }
export async function DeveloperGroups(): Promise<Collection<DeveloperGroup>> { return (await getDb()).collection<DeveloperGroup>('developer_groups'); }
export async function GroupMemberships(): Promise<Collection<GroupMembership>> { return (await getDb()).collection<GroupMembership>('group_memberships'); }
export async function Projects(): Promise<Collection<Project>> { return (await getDb()).collection<Project>('projects'); }
export async function KbDocuments(): Promise<Collection<KbDocument>> { return (await getDb()).collection<KbDocument>('kb_documents'); }
export async function Chats(): Promise<Collection<Chat>> { return (await getDb()).collection<Chat>('chats'); }
export async function ChatMessages(): Promise<Collection<ChatMessage>> { return (await getDb()).collection<ChatMessage>('chat_messages'); }
export async function Files(): Promise<Collection<FileDoc>> { return (await getDb()).collection<FileDoc>('files'); }
export async function AuditLogs(): Promise<Collection<AuditLog>> { return (await getDb()).collection<AuditLog>('audit_logs'); }
