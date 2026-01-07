import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { OrgAuthedRequest } from "../middlewares/org";

const listSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export async function listReviews(req: OrgAuthedRequest, res: Response) {
  const projectId = req.params.projectId;

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: req.org!.id },
    select: { id: true },
  });
  if (!project)
    return res.status(404).json({ ok: false, error: "Project not found" });

  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const reviews = await prisma.reviewItem.findMany({
    where: {
      projectId,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
    select: {
      id: true,
      artifactType: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      reviewerNote: true,
      createdBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ ok: true, reviews });
}

const approveSchema = z.object({
  outputText: z.string().optional(),
  outputJson: z.any().optional(),
  note: z.string().max(1000).optional(),
});

export async function approveReview(req: OrgAuthedRequest, res: Response) {
  const reviewId = req.params.reviewId;

  const review = await prisma.reviewItem.findFirst({
    where: { id: reviewId, project: { orgId: req.org!.id } },
    select: {
      id: true,
      status: true,
      projectId: true,
      artifactType: true,
      outputText: true,
      outputJson: true,
    },
  });

  if (!review)
    return res.status(404).json({ ok: false, error: "Review not found" });
  if (review.status !== "PENDING")
    return res.status(400).json({ ok: false, error: "Review is not pending" });

  const parsed = approveSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const finalText = parsed.data.outputText ?? review.outputText ?? null;
  const finalJson = parsed.data.outputJson ?? review.outputJson ?? null;

  if (!finalText && !finalJson) {
    return res.status(400).json({ ok: false, error: "No output to approve" });
  }

  const artifact = await prisma.artifact.findUnique({
    where: {
      projectId_type: {
        projectId: review.projectId,
        type: review.artifactType,
      },
    },
    select: { id: true },
  });
  if (!artifact)
    return res
      .status(500)
      .json({ ok: false, error: "Artifact missing for this project/type" });

  const last = await prisma.artifactVersion.findFirst({
    where: { artifactId: artifact.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (last?.version || 0) + 1;

  const result = await prisma.$transaction(async (tx) => {
    const version = await tx.artifactVersion.create({
      data: {
        artifactId: artifact.id,
        version: nextVersion,
        contentText: finalText,
        contentJson: finalJson,
        createdById: req.user!.id,
      },
      select: { id: true, version: true, createdAt: true },
    });

    const updatedReview = await tx.reviewItem.update({
      where: { id: review.id },
      data: {
        status: "APPROVED",
        outputText: finalText,
        outputJson: finalJson,
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        reviewerNote: parsed.data.note ?? null,
      },
      select: { id: true, status: true, reviewedAt: true },
    });

    return { version, updatedReview };
  });

  return res.json({ ok: true, ...result });
}

const rejectSchema = z.object({
  note: z.string().min(1).max(1000),
});

export async function rejectReview(req: OrgAuthedRequest, res: Response) {
  const reviewId = req.params.reviewId;

  const review = await prisma.reviewItem.findFirst({
    where: { id: reviewId, project: { orgId: req.org!.id } },
    select: { id: true, status: true },
  });

  if (!review)
    return res.status(404).json({ ok: false, error: "Review not found" });
  if (review.status !== "PENDING")
    return res.status(400).json({ ok: false, error: "Review is not pending" });

  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const updated = await prisma.reviewItem.update({
    where: { id: reviewId },
    data: {
      status: "REJECTED",
      reviewedById: req.user!.id,
      reviewedAt: new Date(),
      reviewerNote: parsed.data.note,
    },
    select: { id: true, status: true, reviewedAt: true },
  });

  return res.json({ ok: true, review: updated });
}
