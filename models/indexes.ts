import { DeveloperGroups, Projects, Chats, ChatMessages, Files, Users, GroupMemberships, KbDocuments, AuditLogs } from './collections';
export async function ensureIndexes() {
  await (await Users()).createIndex({ email: 1 }, { unique: true });
  await (await DeveloperGroups()).createIndex({ serial: 1 }, { unique: true });
  await (await GroupMemberships()).createIndex({ userId: 1, developerGroupId: 1 }, { unique: true });
  await (await Projects()).createIndex({ developerGroupId: 1 });
  await (await Projects()).createIndex({ serial: 1 }, { unique: true });
  await (await Chats()).createIndex({ developerGroupId: 1 });
  await (await Chats()).createIndex({ projectId: 1 });
  await (await Chats()).createIndex({ serial: 1 }, { unique: true });
  await (await ChatMessages()).createIndex({ chatId: 1, createdAt: -1 });
  await (await Files()).createIndex({ chatId: 1 });
  await (await KbDocuments()).createIndex({ projectId: 1 });
  await (await AuditLogs()).createIndex({ targetType: 1, targetId: 1, createdAt: -1 });
  await (await AuditLogs()).createIndex({ action: 1, createdAt: -1 });
}
