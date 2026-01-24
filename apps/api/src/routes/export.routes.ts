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

exportRouter.use((req, res, next) => {
  console.log(`[export-routes] ${req.method} ${req.path}`);
  next();
});

exportRouter.get("/download/:id", downloadExport);

exportRouter.get(
  "/projects/:projectId/exports",
  requireAuth,
  listProjectExports,
);

exportRouter.post(
  "/projects/:projectId/exports",
  requireAuth,
  requestProjectExport,
);

exportRouter.get("/exports/:id", requireAuth, getExport);
