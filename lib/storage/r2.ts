import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3-compatible) client for storing generated audio files.
 * Free tier: 10 GB storage, zero egress fees.
 *
 * Required env vars:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */

let _client: S3Client | null = null;

export function r2Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return _client;
}

const bucket = () => process.env.R2_BUCKET_NAME ?? "";

/** Presigned URL a client can PUT an audio file to directly. */
export async function createUploadUrl(key: string, contentType = "audio/mpeg", expiresIn = 600) {
  return getSignedUrl(
    r2Client(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

/** Presigned URL for streaming/downloading a stored object. */
export async function createDownloadUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(
    r2Client(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn },
  );
}

/** Public-style key convention for generated tracks. */
export function trackKey(userId: string, trackId: string) {
  return `tracks/${userId}/${trackId}.mp3`;
}
