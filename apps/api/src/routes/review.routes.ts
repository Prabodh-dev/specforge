import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireOrgMember, requireRole } from "../middlewares/org";
import {
  listReviews,
  approveReview,
  rejectReview,
} from "../controllers/review.controller";

export const reviewRouter = Router();

reviewRouter.use(requireAuth);
reviewRouter.use(requireOrgMember);

reviewRouter.get("/projects/:projectId/reviews", listReviews);

reviewRouter.patch(
  "/reviews/:reviewId/approve",
  requireRole(["ADMIN", "REVIEWER"]),
  approveReview
);
reviewRouter.patch(
  "/reviews/:reviewId/reject",
  requireRole(["ADMIN", "REVIEWER"]),
  rejectReview
);
