import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { OrgAuthedRequest } from "../middlewares/org";

const createOrgSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
});

export async function createOrg(req: Request, res: Response) {
  const userId = (req as any).user.id as string;

  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { name, slug } = parsed.data;

  const exists = await prisma.org.findUnique({ where: { slug } });
  if (exists)
    return res.status(409).json({ ok: false, error: "Slug already taken" });

  const org = await prisma.org.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  return res.status(201).json({ ok: true, org });
}

export async function listMyOrgs(req: Request, res: Response) {
  const userId = (req as any).user.id as string;

  const orgs = await prisma.orgMember.findMany({
    where: { userId },
    select: {
      role: true,
      org: { select: { id: true, name: true, slug: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    ok: true,
    orgs: orgs.map((m) => ({ ...m.org, role: m.role })),
  });
}

export async function getOrg(req: OrgAuthedRequest, res: Response) {
  const orgId = req.params.orgId;

  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  return res.json({ ok: true, org, myRole: req.org!.role });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "PM", "DEV", "REVIEWER"]).default("DEV"),
});

export async function inviteMember(req: OrgAuthedRequest, res: Response) {
  const orgId = req.params.orgId;

  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { email, role } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user)
    return res
      .status(404)
      .json({
        ok: false,
        error: "User not found. Ask them to register first.",
      });

  const existing = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.id } },
  });
  if (existing)
    return res.status(409).json({ ok: false, error: "Already a member" });

  const member = await prisma.orgMember.create({
    data: { orgId, userId: user.id, role },
    select: { userId: true, role: true, createdAt: true },
  });

  return res.status(201).json({ ok: true, member });
}

export async function listMembers(req: OrgAuthedRequest, res: Response) {
  const orgId = req.params.orgId;

  const members = await prisma.orgMember.findMany({
    where: { orgId },
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return res.json({ ok: true, members });
}

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "PM", "DEV", "REVIEWER"]),
});

export async function updateMemberRole(req: OrgAuthedRequest, res: Response) {
  const orgId = req.params.orgId;
  const userId = req.params.userId;

  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  // prevent removing last admin accidentally
  if (parsed.data.role !== "ADMIN") {
    const adminCount = await prisma.orgMember.count({
      where: { orgId, role: "ADMIN" },
    });
    const isTargetAdmin = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      select: { role: true },
    });

    if (adminCount === 1 && isTargetAdmin?.role === "ADMIN") {
      return res
        .status(400)
        .json({ ok: false, error: "Cannot demote the last ADMIN" });
    }
  }

  const updated = await prisma.orgMember.update({
    where: { orgId_userId: { orgId, userId } },
    data: { role: parsed.data.role },
    select: { userId: true, role: true },
  });

  return res.json({ ok: true, member: updated });
}

export async function removeMember(req: OrgAuthedRequest, res: Response) {
  const orgId = req.params.orgId;
  const userId = req.params.userId;

  // prevent deleting last admin
  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
    select: { role: true },
  });

  if (!member)
    return res.status(404).json({ ok: false, error: "Member not found" });

  if (member.role === "ADMIN") {
    const adminCount = await prisma.orgMember.count({
      where: { orgId, role: "ADMIN" },
    });
    if (adminCount === 1)
      return res
        .status(400)
        .json({ ok: false, error: "Cannot remove the last ADMIN" });
  }

  await prisma.orgMember.delete({ where: { orgId_userId: { orgId, userId } } });
  return res.json({ ok: true });
}
