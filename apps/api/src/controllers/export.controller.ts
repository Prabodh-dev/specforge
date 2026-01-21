import path from "path";
import fs from "fs";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { enqueueExport } from "../queues/exports.queue";
import { processExportDirectly } from "../services/export-processor";

type AuthedReq = Request & { user?: { id: string }; orgId?: string };

function getOrgId(req: AuthedReq) {
  return (
    req.orgId ||
    (req.headers["x-org-id"] as string | undefined) ||
    ""
  ).toString();
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export async function listProjectExports(req: AuthedReq, res: Response) {
  const orgId = getOrgId(req);
  const { projectId } = req.params;

  if (!orgId)
    return res.status(400).json({ ok: false, error: "Missing orgId" });

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId },
    select: { id: true },
  });
  if (!project)
    return res.status(404).json({ ok: false, error: "Project not found" });

  const items = await prisma.exportFile.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  res.json({ ok: true, items });
}

export async function requestProjectExport(req: AuthedReq, res: Response) {
  const orgId = getOrgId(req);
  const { projectId } = req.params;
  const { type } = req.body as { type?: string };

  if (!orgId)
    return res.status(400).json({ ok: false, error: "Missing orgId" });
  if (!type) return res.status(400).json({ ok: false, error: "Missing type" });

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId },
    select: { id: true },
  });
  if (!project)
    return res.status(404).json({ ok: false, error: "Project not found" });

  const created = await prisma.exportFile.create({
    data: {
      projectId,
      type: type as any,
      status: "QUEUED",
      requestedById: req.user?.id ?? null,
    },
  });

  const queued = await enqueueExport(created.id);

  // If Redis not available, process directly
  if (!queued) {
    console.log("[exports] Redis not available, processing directly");
    console.log(
      "[exports] Export ID:",
      created.id,
      "Project ID:",
      projectId,
      "Type:",
      type,
    );
    try {
      await processExportDirectly(created.id);
      console.log("[exports] Direct processing completed successfully");
    } catch (err: any) {
      console.error("[exports] Direct processing failed:", err);
      console.error("[exports] Error stack:", err.stack);
      return res
        .status(500)
        .json({ ok: false, error: err.message || "Export processing failed" });
    }
  }

  res.json({ ok: true, export: created });
}

export async function downloadExport(req: AuthedReq, res: Response) {
  const orgId = getOrgId(req);
  const { id } = req.params;

  if (!orgId)
    return res.status(400).json({ ok: false, error: "Missing orgId" });

  const file = await prisma.exportFile.findFirst({
    where: { id, project: { orgId } },
    include: { project: true },
  });

  if (!file)
    return res.status(404).json({ ok: false, error: "Export not found" });
  if (file.status !== "DONE")
    return res.status(400).json({ ok: false, error: "Export not ready" });

  // if uploaded to R2/public URL
  if (file.publicUrl) return res.redirect(file.publicUrl);

  // local dev fallback
  if (!file.r2Key)
    return res.status(400).json({ ok: false, error: "No file key" });

  const localPath = path.resolve(
    process.cwd(),
    "../../tmp/exports",
    file.r2Key,
  );

  if (!fs.existsSync(localPath))
    return res.status(404).json({ ok: false, error: "File missing on disk" });

  return res.download(localPath);
}
