import { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "./auth";

export type OrgAuthedRequest = AuthedRequest & {
  org?: {
    id: string;
    role: "ADMIN" | "PM" | "DEV" | "REVIEWER";
  };
};

export async function requireOrgMember(
  req: OrgAuthedRequest,
  res: Response,
  next: NextFunction
) {
  const orgId =
    (req.headers["x-org-id"] as string) || (req.query.orgId as string);

  if (!orgId) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing orgId (send x-org-id header)" });
  }

  const membership = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: req.user!.id } },
    select: { role: true, orgId: true },
  });

  if (!membership)
    return res
      .status(403)
      .json({ ok: false, error: "Not a member of this org" });

  req.org = { id: membership.orgId, role: membership.role as any };
  return next();
}

export function requireRole(roles: Array<"ADMIN" | "PM" | "DEV" | "REVIEWER">) {
  return (req: OrgAuthedRequest, res: Response, next: NextFunction) => {
    const role = req.org?.role;
    if (!role)
      return res.status(500).json({ ok: false, error: "Org context missing" });

    if (!roles.includes(role)) {
      return res
        .status(403)
        .json({ ok: false, error: `Requires role: ${roles.join(", ")}` });
    }
    return next();
  };
}
