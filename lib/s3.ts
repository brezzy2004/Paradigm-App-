import { S3Client, PutObjectCommand, HeadObjectCommand, CreateBucketCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const BUCKET = process.env.S3_BUCKET!;
export const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: !!process.env.S3_ENDPOINT,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! }
});

export async function ensureBucketAndCors(origins: string[] = ['http://localhost:3000']) {
  try { await s3.send(new CreateBucketCommand({ Bucket: BUCKET })); } catch {}
  try {
    await s3.send(new PutBucketCorsCommand({ Bucket: BUCKET, CORSConfiguration: {
      CORSRules: [{
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET','PUT','HEAD'],
        AllowedOrigins: origins,
        ExposeHeaders: ['ETag','x-amz-request-id','x-minio-request-id'],
        MaxAgeSeconds: 3000
      }]
    }}));
  } catch (error: any) {
    const notImplemented = error?.Code === 'NotImplemented' || error?.name === 'NotImplemented' || error?.$metadata?.httpStatusCode === 501;
    if (notImplemented) {
      console.warn('Bucket-level CORS is not implemented by the S3 endpoint. Skipping PutBucketCors. Configure CORS on the server if needed.');
    } else {
      throw error;
    }
  }
}
export function headObject(objectKey: string) {
  return s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: objectKey }));
}
export function presignPut(objectKey: string, contentType: string, expiresIn = 900) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: objectKey, ContentType: contentType });
  return getSignedUrl(s3, cmd, { expiresIn });
}
