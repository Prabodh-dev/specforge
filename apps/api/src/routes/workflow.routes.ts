import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireOrgMember, requireRole } from "../middlewares/org";
import { runWorkflow } from "../controllers/workflow.controller";

export const workflowRouter = Router();

workflowRouter.use(requireAuth);
workflowRouter.use(requireOrgMember);

workflowRouter.post(
  "/projects/:projectId/workflows/:workflowKey/run",
  requireRole(["ADMIN", "PM"]),
  runWorkflow
);
