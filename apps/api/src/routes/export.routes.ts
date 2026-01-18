import { Router } from "express";
import {
  listProjectExports,
  requestProjectExport,
  downloadExport,
} from "../controllers/export.controller";

export const exportRouter = Router();

// list exports for a project
exportRouter.get("/projects/:projectId/exports", listProjectExports);

// request an export for a project
exportRouter.post("/projects/:projectId/exports", requestProjectExport);

// download (dev/local) or redirect to publicUrl (R2)
exportRouter.get("/exports/:id/download", downloadExport);
