import { prisma } from "../lib/prisma";
import * as fs from "fs/promises";
import * as path from "path";
import JSZip from "jszip";
import { r2Enabled, uploadToR2, getPublicUrl } from "../lib/r2";

async function getLatestArtifact(projectId: string, type: any) {
  const artifact = await prisma.artifact.findFirst({
    where: { projectId, type },
    select: { id: true },
  });
  if (!artifact) return null;

  const latest = await prisma.artifactVersion.findFirst({
    where: { artifactId: artifact.id },
    orderBy: { version: "desc" },
    select: { contentText: true, contentJson: true, version: true },
  });
  return latest ?? null;
}

export async function processExportDirectly(exportId: string) {
  try {
    console.log(`[exports] Processing export ${exportId} directly`);

    if (!r2Enabled()) {
      throw new Error(
        "R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (and optionally R2_PUBLIC_BASE_URL).",
      );
    }

    const exportRecord = await prisma.exportFile.findUnique({
      where: { id: exportId },
      include: { project: true },
    });

    if (!exportRecord) {
      throw new Error(`Export ${exportId} not found`);
    }

    await prisma.exportFile.update({
      where: { id: exportId },
      data: { status: "PROCESSING" },
    });

    const { projectId, type } = exportRecord;

    const { buffer, filename, contentType } = await buildExportBuffer(
      projectId,
      type as any,
    );

    const r2Key = `exports/${projectId}/${filename}`;
    const publicUrl = await uploadToR2(r2Key, buffer, contentType);
    console.log(`[exports] Uploaded to R2: ${r2Key}`);

    await prisma.exportFile.update({
      where: { id: exportId },
      data: {
        status: "DONE",
        r2Key,
        publicUrl: publicUrl || null,
        completedAt: new Date(),
      },
    });

    console.log(`[exports] Export ${exportId} completed: ${r2Key}`);
  } catch (error: any) {
    console.error(`[exports] Failed to process export ${exportId}:`, error);

    await prisma.exportFile
      .update({
        where: { id: exportId },
        data: {
          status: "FAILED",
          error: error.message,
          completedAt: new Date(),
        },
      })
      .catch((err) => {
        console.error(
          `[exports] Failed to update export status to FAILED:`,
          err,
        );
      });
  }
}

async function buildExportBuffer(
  projectId: string,
  type: "PRD_MD" | "API_SPEC_JSON" | "DB_SCHEMA_JSON" | "SCAFFOLD_ZIP",
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  switch (type) {
    case "PRD_MD": {
      const prd = await getLatestArtifact(projectId, "PRD");
      if (!prd?.contentText) {
        throw new Error("No PRD content to export");
      }
      const buffer = Buffer.from(prd.contentText, "utf-8");
      return {
        buffer,
        filename: `${projectId}-prd.md`,
        contentType: "text/markdown",
      };
    }

    case "API_SPEC_JSON": {
      const apiSpec = await getLatestArtifact(projectId, "API_SPEC");
      if (!apiSpec?.contentJson) {
        throw new Error("No API_SPEC JSON to export");
      }
      const buffer = Buffer.from(
        JSON.stringify(apiSpec.contentJson, null, 2),
        "utf-8",
      );
      return {
        buffer,
        filename: `${projectId}-api-spec.json`,
        contentType: "application/json",
      };
    }

    case "DB_SCHEMA_JSON": {
      const dbSchema = await getLatestArtifact(projectId, "DB_SCHEMA");
      if (!dbSchema?.contentJson) {
        throw new Error("No DB_SCHEMA JSON to export");
      }
      const buffer = Buffer.from(
        JSON.stringify(dbSchema.contentJson, null, 2),
        "utf-8",
      );
      return {
        buffer,
        filename: `${projectId}-db-schema.json`,
        contentType: "application/json",
      };
    }

    case "SCAFFOLD_ZIP": {
      const prd = await getLatestArtifact(projectId, "PRD");
      const apiSpec = await getLatestArtifact(projectId, "API_SPEC");
      const dbSchema = await getLatestArtifact(projectId, "DB_SCHEMA");

      const buffer = await createScaffoldZip(projectId, prd, apiSpec, dbSchema);
      return {
        buffer,
        filename: `${projectId}-scaffold.zip`,
        contentType: "application/zip",
      };
    }

    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

async function createScaffoldZip(
  projectId: string,
  prd: any,
  apiSpec: any,
  dbSchema: any,
): Promise<Buffer> {
  const zip = new JSZip();

  if (prd?.contentText) {
    zip.file("PRD.md", prd.contentText);
  }

  if (apiSpec?.contentJson) {
    zip.file("api-spec.json", JSON.stringify(apiSpec.contentJson, null, 2));
  }

  if (dbSchema?.contentJson) {
    zip.file("db-schema.json", JSON.stringify(dbSchema.contentJson, null, 2));
  }

  const readme = `# Project Scaffold: ${projectId}

This package contains all the approved artifacts for your project:

- PRD.md - Product Requirements Document
- api-spec.json - API Specification
- db-schema.json - Database Schema

Generated on: ${new Date().toISOString()}
`;
  zip.file("README.md", readme);

  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}
