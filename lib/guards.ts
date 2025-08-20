import { ObjectId } from 'mongodb';
import { GroupMemberships, Projects, Chats } from '@/models/collections';
type Role = 'OWNER'|'ADMIN'|'MEMBER';
const rank: Record<Role, number> = { MEMBER:1, ADMIN:2, OWNER:3 };
export async function assertGroupRole(userId: string, developerGroupId: string, min: Role = 'MEMBER') {
  const m = await (await GroupMemberships()).findOne({ userId: new ObjectId(userId), developerGroupId: new ObjectId(developerGroupId) });
  if (!m) throw new Error('Forbidden: not a member of this group');
  if (rank[m.role as Role] < rank[min]) throw new Error('Forbidden: insufficient role');
  return m;
}
export async function assertProjectRole(userId: string, projectId: string, min: Role = 'MEMBER') {
  const project = await (await Projects()).findOne({ _id: new ObjectId(projectId) });
  if (!project) throw new Error('Project not found');
  const m = await (await GroupMemberships()).findOne({ userId: new ObjectId(userId), developerGroupId: project.developerGroupId });
  if (!m) throw new Error('Forbidden: not a member of this project group');
  if (rank[m.role as Role] < rank[min]) throw new Error('Forbidden: insufficient role');
  return { project, membership: m };
}
export async function assertChatRole(userId: string, chatId: string, min: Role = 'MEMBER') {
  const chat = await (await Chats()).findOne({ _id: new ObjectId(chatId) });
  if (!chat) throw new Error('Chat not found');
  const m = await (await GroupMemberships()).findOne({ userId: new ObjectId(userId), developerGroupId: chat.developerGroupId });
  if (!m) throw new Error('Forbidden: not a member of this chat group');
  if (rank[m.role as Role] < rank[min]) throw new Error('Forbidden: insufficient role');
  return { chat, membership: m };
}
