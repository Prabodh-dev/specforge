import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { processExportDirectly } from "../services/export-processor";
import { getObjectFromR2 } from "../lib/r2";

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

  processExportDirectly(created.id).catch((err: any) => {
    console.error("[exports] Direct processing failed:", err);
  });

  res.json({ ok: true, export: created });
}

export async function downloadExport(req: AuthedReq, res: Response) {
  const { id } = req.params;
  console.log(`[exports.downloadExport] Called with id=${id}`);
  console.log(
    `[exports.downloadExport] req.path=${req.path}, req.url=${req.url}`,
  );
  console.log(`[exports.downloadExport] Headers:`, req.headers);

  const file = await prisma.exportFile.findFirst({
    where: { id },
    include: { project: true },
  });

  if (!file) {
    console.log(`[exports] Export ${id} not found`);
    return res.status(404).json({ ok: false, error: "Export not found" });
  }
  if (file.status !== "DONE") {
    console.log(`[exports] Export ${id} not ready, status=${file.status}`);
    return res.status(400).json({ ok: false, error: "Export not ready" });
  }

  if (!file.publicUrl) {
    console.log(`[exports] Export ${id} has no publicUrl`);
    return res.status(400).json({
      ok: false,
      error: "Export not yet available in R2. Please check back in a moment.",
    });
  }

  try {
    const r2Key = file.r2Key || file.publicUrl?.split("/").slice(-3).join("/");
    console.log(`[exports] Streaming from R2 key=${r2Key}`);
    const obj = await getObjectFromR2(r2Key!);
    const filename =
      file.r2Key?.split("/").pop() ||
      file.publicUrl?.split("/").pop() ||
      "export";
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    if (obj.ContentType) res.setHeader("Content-Type", obj.ContentType);
    obj.Body.pipe(res);
  } catch (e) {
    console.error(`[exports] Failed to stream from R2`, e);
    return res.status(500).json({ ok: false, error: "Failed to fetch file" });
  }
}

export async function getExport(req: AuthedReq, res: Response) {
  const orgId = getOrgId(req);
  const { id } = req.params;

  if (!orgId)
    return res.status(400).json({ ok: false, error: "Missing orgId" });

  const file = await prisma.exportFile.findFirst({
    where: { id, project: { orgId } },
  });

  if (!file) return res.status(404).json({ ok: false, error: "Not found" });

  return res.json({ ok: true, export: file });
}
