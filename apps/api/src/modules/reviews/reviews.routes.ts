import { Router } from "express";
import {
  listReviews,
  getReviewDetail,
  approveReview,
  rejectReview,
} from "./reviews.controller";
import { getLatestReviewForProject } from "./reviews.controller";

export const reviewsRouter = Router();

reviewsRouter.get("/reviews", listReviews);
reviewsRouter.get("/reviews/:id", getReviewDetail);
reviewsRouter.post("/reviews/:id/approve", approveReview);
reviewsRouter.post("/reviews/:id/reject", rejectReview);
reviewsRouter.get(
  "/projects/:projectId/reviews/latest",
  getLatestReviewForProject,
);
