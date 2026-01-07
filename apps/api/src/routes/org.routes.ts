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

// my orgs
orgRouter.get("/", listMyOrgs);

// create org (creator becomes ADMIN)
orgRouter.post("/", createOrg);

// org details (must be member)
orgRouter.get("/:orgId", requireOrgMember, getOrg);

// members
orgRouter.get("/:orgId/members", requireOrgMember, listMembers);

// invite (ADMIN only)
orgRouter.post(
  "/:orgId/invite",
  requireOrgMember,
  requireRole(["ADMIN"]),
  inviteMember
);

// change role (ADMIN only)
orgRouter.patch(
  "/:orgId/members/:userId/role",
  requireOrgMember,
  requireRole(["ADMIN"]),
  updateMemberRole
);

// remove member (ADMIN only)
orgRouter.delete(
  "/:orgId/members/:userId",
  requireOrgMember,
  requireRole(["ADMIN"]),
  removeMember
);
