import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function makeR2Client(opts: {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}) {
  return new S3Client({
    region: "auto",
    endpoint: opts.endpoint,
    credentials: {
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function uploadBuffer(params: {
  s3: S3Client;
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}) {
  await params.s3.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}
