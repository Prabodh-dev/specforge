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

// org context required
projectRouter.use(requireOrgMember);

// PM+ and ADMIN can create projects (DEV can also if you want; keeping strict)
projectRouter.post("/", requireRole(["ADMIN", "PM"]), createProject);

// any member can list/view
projectRouter.get("/", listProjects);
projectRouter.get("/:projectId", getProject);
