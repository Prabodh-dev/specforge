import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireOrgMember, requireRole } from "../middlewares/org";
import {
  createOrg,
  listMyOrgs,
  getOrg,
  inviteMember,
  listMembers,
  updateMemberRole,
  removeMember,
} from "../controllers/org.controller";

export const orgRouter = Router();

orgRouter.use(requireAuth);

orgRouter.get("/", listMyOrgs);

orgRouter.post("/", createOrg);

orgRouter.get("/:orgId", requireOrgMember, getOrg);

orgRouter.get("/:orgId/members", requireOrgMember, listMembers);

orgRouter.post(
  "/:orgId/invite",
  requireOrgMember,
  requireRole(["ADMIN"]),
  inviteMember
);

orgRouter.patch(
  "/:orgId/members/:userId/role",
  requireOrgMember,
  requireRole(["ADMIN"]),
  updateMemberRole
);

orgRouter.delete(
  "/:orgId/members/:userId",
  requireOrgMember,
  requireRole(["ADMIN"]),
  removeMember
);
