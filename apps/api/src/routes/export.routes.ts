import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  listProjectExports,
  requestProjectExport,
  downloadExport,
  getExport,
} from "../controllers/export.controller";

type AuthedReq = Request & { user?: { id: string }; orgId?: string };

export const exportRouter = Router();

// Debug middleware to log all requests
exportRouter.use((req, res, next) => {
  console.log(`[export-routes] ${req.method} ${req.path}`);
  next();
});

// Download endpoint - different path to avoid conflicts
// NO auth required (R2 URLs are public) - user can download directly
exportRouter.get("/download/:id", downloadExport);

// list exports for a project - requires auth
exportRouter.get(
  "/projects/:projectId/exports",
  requireAuth,
  listProjectExports,
);

// request an export for a project - requires auth
exportRouter.post(
  "/projects/:projectId/exports",
  requireAuth,
  requestProjectExport,
);

// fetch single export by id - requires auth
exportRouter.get("/exports/:id", requireAuth, getExport);
