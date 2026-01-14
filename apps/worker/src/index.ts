import path from "path";
import dotenv from "dotenv";
import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { makeRedis } from "./queue/redis";
import { makeR2Client, uploadBuffer } from "./services/r2";
import { buildExport } from "./services/export-builders";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const REDIS_URL = process.env.REDIS_URL!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || "";

if (!REDIS_URL) throw new Error("Missing REDIS_URL");
if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  throw new Error("Missing R2 env vars");
}

const prisma = new PrismaClient();
const connection = makeRedis(REDIS_URL);
const s3 = makeR2Client({
  endpoint: R2_ENDPOINT,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
});

const EXPORTS_QUEUE_NAME = "exports";

console.log("[worker] starting exports worker...");

new Worker(
  EXPORTS_QUEUE_NAME,
  async (job) => {
    const exportId = job.data.exportId as string;

    await prisma.exportFile.update({
      where: { id: exportId },
      data: { status: "PROCESSING" },
    });

    try {
      const built = await buildExport(prisma, exportId);

      const key = `exports/${exportId}/${built.filename}`;

      await uploadBuffer({
        s3,
        bucket: R2_BUCKET,
        key,
        body: built.body,
        contentType: built.contentType,
      });

      const publicUrl = R2_PUBLIC_BASE_URL
        ? `${R2_PUBLIC_BASE_URL}/${key}`
        : null;

      await prisma.exportFile.update({
        where: { id: exportId },
        data: {
          status: "DONE",
          r2Key: key,
          publicUrl,
          completedAt: new Date(),
          error: null,
        },
      });

      return { ok: true, key };
    } catch (err: any) {
      await prisma.exportFile.update({
        where: { id: exportId },
        data: {
          status: "FAILED",
          error: err?.message || "Unknown error",
          completedAt: new Date(),
        },
      });
      throw err;
    }
  },
  { connection }
);
