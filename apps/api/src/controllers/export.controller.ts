import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { OrgAuthedRequest } from "../middlewares/org";
import { exportsQueue } from "../queue/exports.queue";
import { getSignedDownloadUrl } from "../services/r2.service";

const createSchema = z.object({
  type: z.enum(["PRD_MD", "OPENAPI_JSON", "DB_SCHEMA_JSON", "SCAFFOLD_ZIP"]),
});

export async function createExport(req: OrgAuthedRequest, res: Response) {
  const projectId = req.params.projectId;

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: req.org!.id },
    select: { id: true },
  });
  if (!project)
    return res.status(404).json({ ok: false, error: "Project not found" });

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const exp = await prisma.exportFile.create({
    data: {
      projectId,
      type: parsed.data.type,
      status: "QUEUED",
      requestedById: req.user!.id,
    },
    select: { id: true, type: true, status: true, createdAt: true },
  });

  await exportsQueue.add(
    "export",
    { exportId: exp.id },
    { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
  );

  return res.status(201).json({ ok: true, export: exp });
}

export async function listExports(req: OrgAuthedRequest, res: Response) {
  const projectId = req.params.projectId;

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: req.org!.id },
    select: { id: true },
  });
  if (!project)
    return res.status(404).json({ ok: false, error: "Project not found" });

  const exports = await prisma.exportFile.findMany({
    where: { projectId },
    select: {
      id: true,
      type: true,
      status: true,
      error: true,
      publicUrl: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ ok: true, exports });
}

export async function getExportDownloadUrl(
  req: OrgAuthedRequest,
  res: Response
) {
  const exportId = req.params.exportId;

  const exp = await prisma.exportFile.findFirst({
    where: { id: exportId, project: { orgId: req.org!.id } },
    select: { id: true, status: true, r2Key: true, publicUrl: true },
  });

  if (!exp)
    return res.status(404).json({ ok: false, error: "Export not found" });
  if (exp.status !== "DONE")
    return res.status(400).json({ ok: false, error: "Export not ready yet" });
  if (exp.publicUrl) return res.json({ ok: true, url: exp.publicUrl });

  if (!exp.r2Key)
    return res.status(500).json({ ok: false, error: "Missing r2Key" });

  const url = await getSignedDownloadUrl(exp.r2Key);
  return res.json({ ok: true, url });
}
