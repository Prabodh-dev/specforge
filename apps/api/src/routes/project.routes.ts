import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireOrgMember, requireRole } from "../middlewares/org";
import {
  createProject,
  listProjects,
  getProject,
} from "../controllers/project.controller";

export const projectRouter = Router();

projectRouter.use(requireAuth);

projectRouter.use(requireOrgMember);

projectRouter.post("/", requireRole(["ADMIN", "PM"]), createProject);

projectRouter.get("/", listProjects);
projectRouter.get("/:projectId", getProject);
