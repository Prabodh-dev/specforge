import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireOrgMember, requireRole } from "../middlewares/org";
import {
  createExport,
  listExports,
  getExportDownloadUrl,
} from "../controllers/export.controller";

export const exportRouter = Router();

exportRouter.use(requireAuth);
exportRouter.use(requireOrgMember);

// PM/Admin can request exports
exportRouter.post(
  "/projects/:projectId/exports",
  requireRole(["ADMIN", "PM"]),
  createExport
);

// anyone in org can view exports
exportRouter.get("/projects/:projectId/exports", listExports);

// signed download url
exportRouter.get("/exports/:exportId/download-url", getExportDownloadUrl);
