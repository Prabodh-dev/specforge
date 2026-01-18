import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

type AuthedRequest = Request & {
  user?: { id: string };
  orgId?: string;
};

function getOrgId(req: AuthedRequest): string {
  // supports either middleware-populated req.orgId OR header used by your apiFetch
  const orgId =
    req.orgId ||
    (req.headers["x-org-id"] as string | undefined) ||
    (req.headers["X-Org-Id"] as any);

  if (!orgId) {
    // keep 400 so frontend can show clear message
    throw new Error("Missing orgId (set req.orgId or send x-org-id header)");
  }
  return String(orgId);
}

function isJsonArtifact(type: string) {
  return (
    type === "OPENAPI" ||
    type === "DB_SCHEMA" ||
    type === "USER_STORIES" ||
    type === "TASK_BREAKDOWN"
  );
}

/**
 * GET /reviews
 * Optional query params:
 *  - status=PENDING|APPROVED|REJECTED
 *  - projectId=<id>
 *  - artifactType=PRD|USER_STORIES|OPENAPI|DB_SCHEMA|TASK_BREAKDOWN
 */
export async function listReviews(req: AuthedRequest, res: Response) {
  try {
    const orgId = getOrgId(req);

    const status = req.query.status ? String(req.query.status) : undefined;
    const projectId = req.query.projectId
      ? String(req.query.projectId)
      : undefined;
    const artifactType = req.query.artifactType
      ? String(req.query.artifactType)
      : undefined;

    const items = await prisma.reviewItem.findMany({
      where: {
        project: { orgId },
        ...(status ? { status: status as any } : {}),
        ...(projectId ? { projectId } : {}),
        ...(artifactType ? { artifactType: artifactType as any } : {}),
      },
      select: {
        id: true,
        projectId: true,
        artifactType: true,
        status: true,
        reviewerNote: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    return res.json({ ok: true, items });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, error: e?.message ?? "Failed to list reviews" });
  }
}

/**
 * GET /reviews/:id
 * Returns:
 *  - item: review item
 *  - latest: latest ArtifactVersion of matching artifact (projectId + artifactType)
 */
export async function getReviewDetail(req: AuthedRequest, res: Response) {
  try {
    const orgId = getOrgId(req);
    const { id } = req.params;

    const item = await prisma.reviewItem.findFirst({
      where: { id, project: { orgId } },
      select: {
        id: true,
        projectId: true,
        artifactType: true,
        status: true,
        inputJson: true,
        outputText: true,
        outputJson: true,
        reviewerNote: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item)
      return res.status(404).json({ ok: false, error: "Review not found" });

    const artifact = await prisma.artifact.findFirst({
      where: { projectId: item.projectId, type: item.artifactType as any },
      select: { id: true },
    });

    let latest: any = null;

    if (artifact) {
      latest = await prisma.artifactVersion.findFirst({
        where: { artifactId: artifact.id },
        orderBy: { version: "desc" },
        select: {
          version: true,
          contentText: true,
          contentJson: true,
          createdAt: true,
        },
      });
    }

    return res.json({ ok: true, item, latest: latest ?? null });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, error: e?.message ?? "Failed to load review detail" });
  }
}

/**
 * POST /reviews/:id/approve
 * body: { reviewerNote?: string }
 *
 * Creates a new ArtifactVersion from review.outputText/outputJson
 * and marks review APPROVED.
 */
export async function approveReview(req: AuthedRequest, res: Response) {
  try {
    const orgId = getOrgId(req);
    const reviewerId = req.user?.id ?? null;
    const reviewerNote = req.body?.reviewerNote
      ? String(req.body.reviewerNote)
      : "";

    const review = await prisma.reviewItem.findFirst({
      where: { id: req.params.id, project: { orgId } },
    });

    if (!review)
      return res.status(404).json({ ok: false, error: "Review not found" });
    if (review.status !== "PENDING") {
      return res
        .status(400)
        .json({ ok: false, error: `Review already ${review.status}` });
    }

    const wantsJson = isJsonArtifact(review.artifactType);

    if (wantsJson && !review.outputJson) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing outputJson in review" });
    }
    if (!wantsJson && !review.outputText) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing outputText in review" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Ensure artifact exists for this project + type
      let artifact = await tx.artifact.findFirst({
        where: {
          projectId: review.projectId,
          type: review.artifactType as any,
        },
      });

      if (!artifact) {
        artifact = await tx.artifact.create({
          data: {
            projectId: review.projectId,
            type: review.artifactType as any,
            title: review.artifactType, // simple default title
          },
        });
      }

      const last = await tx.artifactVersion.findFirst({
        where: { artifactId: artifact.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const nextVersion = (last?.version ?? 0) + 1;

      const createdVersion = await tx.artifactVersion.create({
        data: {
          artifactId: artifact.id,
          version: nextVersion,
          contentText: wantsJson ? null : (review.outputText ?? ""),
          contentJson: wantsJson ? (review.outputJson as any) : null,
          createdById: reviewerId,
        },
        select: {
          id: true,
          version: true,
          createdAt: true,
        },
      });

      const updatedReview = await tx.reviewItem.update({
        where: { id: review.id },
        data: {
          status: "APPROVED",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewerNote: reviewerNote || null,
        },
        select: {
          id: true,
          status: true,
          reviewedAt: true,
          reviewedById: true,
          reviewerNote: true,
        },
      });

      return { createdVersion, updatedReview };
    });

    return res.json({ ok: true, ...result });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, error: e?.message ?? "Failed to approve review" });
  }
}

/**
 * POST /reviews/:id/reject
 * body: { reviewerNote?: string }
 */
export async function rejectReview(req: AuthedRequest, res: Response) {
  try {
    const orgId = getOrgId(req);
    const reviewerId = req.user?.id ?? null;
    const reviewerNote = req.body?.reviewerNote
      ? String(req.body.reviewerNote)
      : "";

    const review = await prisma.reviewItem.findFirst({
      where: { id: req.params.id, project: { orgId } },
      select: { id: true, status: true },
    });

    if (!review)
      return res.status(404).json({ ok: false, error: "Review not found" });
    if (review.status !== "PENDING") {
      return res
        .status(400)
        .json({ ok: false, error: `Review already ${review.status}` });
    }

    const updatedReview = await prisma.reviewItem.update({
      where: { id: review.id },
      data: {
        status: "REJECTED",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewerNote: reviewerNote || null,
      },
      select: {
        id: true,
        status: true,
        reviewedAt: true,
        reviewedById: true,
        reviewerNote: true,
      },
    });

    return res.json({ ok: true, updatedReview });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, error: e?.message ?? "Failed to reject review" });
  }
}
export async function getLatestReviewForProject(req: any, res: any) {
  try {
    const orgId = req.orgId || (req.headers["x-org-id"] as string | undefined);
    if (!orgId)
      return res.status(400).json({ ok: false, error: "Missing orgId" });

    const { projectId } = req.params;
    const artifactType = String(req.query.artifactType || "");

    if (!artifactType) {
      return res
        .status(400)
        .json({ ok: false, error: "artifactType is required" });
    }

    // org guard through project relation
    const item = await prisma.reviewItem.findFirst({
      where: {
        projectId,
        artifactType: artifactType as any,
        project: { orgId },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true },
    });

    return res.json({ ok: true, item: item ?? null });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e?.message ?? "Failed" });
  }
}
