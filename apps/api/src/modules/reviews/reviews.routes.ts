import { Router } from "express";
import {
  listReviews,
  getReviewDetail,
  approveReview,
  rejectReview,
} from "./reviews.controller";
import { getLatestReviewForProject } from "./reviews.controller";

export const reviewsRouter = Router();

/**
 * NOTE:
 * If you already apply auth + org middleware globally in apps/api/src/index.ts,
 * you don't need anything here.
 *
 * Otherwise, you can add:
 * reviewsRouter.use(requireAuth, requireOrg)
 */

reviewsRouter.get("/reviews", listReviews);
reviewsRouter.get("/reviews/:id", getReviewDetail);
reviewsRouter.post("/reviews/:id/approve", approveReview);
reviewsRouter.post("/reviews/:id/reject", rejectReview);
reviewsRouter.get(
  "/projects/:projectId/reviews/latest",
  getLatestReviewForProject
);
