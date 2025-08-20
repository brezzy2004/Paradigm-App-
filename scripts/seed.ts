import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import bcrypt from 'bcrypt';

async function main() {
  const { getDb } = await import('../lib/mongodb');
  const db = await getDb();

  const adminPass = await bcrypt.hash('Admin@123', 10);
  const superPass = await bcrypt.hash('Super@123', 10);
  const teamPass = await bcrypt.hash('Team@123', 10);

  const usersCol = db.collection('users');
  const groupsCol = db.collection('developer_groups');
  const membershipsCol = db.collection('group_memberships');

  async function getOrCreateUser(email: string, role: 'ADMIN' | 'MEMBER', passwordHash: string) {
    const now = new Date();
    const existing = await usersCol.findOne({ email });
    if (existing) return existing._id;
    const res = await usersCol.insertOne({ email, role, passwordHash, createdAt: now, failedLogins: 0 });
    return res.insertedId;
  }

  async function upsertGroup(serial: number, name: string, domain: string) {
    const now = new Date();
    // serial has a unique index; use it to upsert
    await groupsCol.updateOne(
      { serial },
      { $setOnInsert: { name, domain, createdAt: now, serial } },
      { upsert: true }
    );
    const g = await groupsCol.findOne({ serial });
    return g!._id;
  }

  const amit = await getOrCreateUser('amit.admin@example.com', 'ADMIN', adminPass);
  const mikael = await getOrCreateUser('mikael.super@example.com', 'ADMIN', superPass);
  const amir = await getOrCreateUser('amir.team@example.com', 'MEMBER', teamPass);

  const g1 = await upsertGroup(1, 'Group 1', 'g1.local');
  const g2 = await upsertGroup(2, 'Group 2', 'g2.local');
  const g3 = await upsertGroup(3, 'Group 3', 'g3.local');

  // Upsert memberships (unique on { userId, developerGroupId })
  await membershipsCol.updateOne(
    { userId: amit, developerGroupId: g1 },
    { $set: { role: 'OWNER' } },
    { upsert: true }
  );
  await membershipsCol.updateOne(
    { userId: amit, developerGroupId: g2 },
    { $set: { role: 'ADMIN' } },
    { upsert: true }
  );
  await membershipsCol.updateOne(
    { userId: amit, developerGroupId: g3 },
    { $set: { role: 'ADMIN' } },
    { upsert: true }
  );
  await membershipsCol.updateOne(
    { userId: mikael, developerGroupId: g1 },
    { $set: { role: 'ADMIN' } },
    { upsert: true }
  );
  await membershipsCol.updateOne(
    { userId: mikael, developerGroupId: g2 },
    { $set: { role: 'OWNER' } },
    { upsert: true }
  );
  await membershipsCol.updateOne(
    { userId: mikael, developerGroupId: g3 },
    { $set: { role: 'ADMIN' } },
    { upsert: true }
  );
  await membershipsCol.updateOne(
    { userId: amir, developerGroupId: g1 },
    { $set: { role: 'MEMBER' } },
    { upsert: true }
  );

  console.log('Seed complete');
}
main().catch((e) => { console.error(e); process.exit(1); });
