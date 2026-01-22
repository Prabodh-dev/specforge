import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

function hasR2() {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

export function r2Enabled() {
  return hasR2();
}

export function getPublicUrl(key: string) {
  // If PUBLIC_BASE_URL is set, use it
  if (process.env.R2_PUBLIC_BASE_URL) {
    const base = process.env.R2_PUBLIC_BASE_URL;
    return `${base.replace(/\/$/, "")}/${key}`;
  }

  // Fallback: construct from R2 endpoint
  // R2 public URL format: https://{bucket}.{subdomain}.r2.cloudflarestorage.com
  // But we can also use: https://{account-id}.r2.cloudflarestorage.com/{bucket}/{key}
  const endpoint = process.env.R2_ENDPOINT || "";
  const bucket = process.env.R2_BUCKET || "";

  // Extract base from endpoint (remove trailing slash and path)
  const baseUrl = endpoint.replace(/\/$/, "");

  return `${baseUrl}/${bucket}/${key}`;
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
) {
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return getPublicUrl(key);
}

export function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function getObjectFromR2(key: string) {
  const client = getR2Client();
  return client.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    }),
  );
}
