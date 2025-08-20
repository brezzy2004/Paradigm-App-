// scripts/initStorage.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// IMPORTANT: import after dotenv so env vars exist
const { ensureBucketAndCors } = await import('../lib/s3');

async function main() {
  await ensureBucketAndCors(['http://localhost:3000']);
  console.log('Bucket + CORS ready');
}
main().catch((e) => { console.error(e); process.exit(1); });
