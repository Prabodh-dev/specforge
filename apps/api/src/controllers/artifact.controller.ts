import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { OrgAuthedRequest } from "../middlewares/org";

const createVersionSchema = z.object({
  contentText: z.string().optional(),
  contentJson: z.any().optional(),
});

export async function getArtifact(req: OrgAuthedRequest, res: Response) {
  const artifactId = req.params.artifactId;

  const artifact = await prisma.artifact.findFirst({
    where: {
      id: artifactId,
      project: { orgId: req.org!.id },
    },
    select: {
      id: true,
      type: true,
      title: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!artifact)
    return res.status(404).json({ ok: false, error: "Artifact not found" });

  return res.json({ ok: true, artifact });
}

export async function listArtifactVersions(
  req: OrgAuthedRequest,
  res: Response
) {
  const artifactId = req.params.artifactId;

  const artifact = await prisma.artifact.findFirst({
    where: { id: artifactId, project: { orgId: req.org!.id } },
    select: { id: true },
  });
  if (!artifact)
    return res.status(404).json({ ok: false, error: "Artifact not found" });

  const versions = await prisma.artifactVersion.findMany({
    where: { artifactId },
    select: {
      id: true,
      version: true,
      contentText: true,
      contentJson: true,
      createdAt: true,
      createdById: true,
    },
    orderBy: { version: "desc" },
  });

  return res.json({ ok: true, versions });
}

export async function createArtifactVersion(
  req: OrgAuthedRequest,
  res: Response
) {
  const artifactId = req.params.artifactId;

  const parsed = createVersionSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { contentText, contentJson } = parsed.data;

  if (!contentText && !contentJson) {
    return res
      .status(400)
      .json({ ok: false, error: "Provide contentText or contentJson" });
  }

  const artifact = await prisma.artifact.findFirst({
    where: { id: artifactId, project: { orgId: req.org!.id } },
    select: { id: true },
  });
  if (!artifact)
    return res.status(404).json({ ok: false, error: "Artifact not found" });

  const last = await prisma.artifactVersion.findFirst({
    where: { artifactId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const nextVersion = (last?.version || 0) + 1;

  const created = await prisma.artifactVersion.create({
    data: {
      artifactId,
      version: nextVersion,
      contentText: contentText ?? null,
      contentJson: contentJson ?? null,
      createdById: req.user!.id,
    },
    select: { id: true, version: true, createdAt: true },
  });

  return res.status(201).json({ ok: true, version: created });
}
