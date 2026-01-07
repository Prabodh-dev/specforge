import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { OrgAuthedRequest } from "../middlewares/org";

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
});

export async function createProject(req: OrgAuthedRequest, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { name, description } = parsed.data;

  const project = await prisma.project.create({
    data: {
      orgId: req.org!.id,
      name,
      description,
      createdById: req.user!.id,
      artifacts: {
        create: [
          { type: "PRD", title: "Product Requirement Document" },
          { type: "USER_STORIES", title: "User Stories" },
          { type: "OPENAPI", title: "API Specification (OpenAPI)" },
          { type: "DB_SCHEMA", title: "Database Schema" },
          { type: "TASK_BREAKDOWN", title: "Task Breakdown" },
        ],
      },
    },
    select: {
      id: true,
      orgId: true,
      name: true,
      description: true,
      createdAt: true,
      artifacts: { select: { id: true, type: true, title: true } },
    },
  });

  return res.status(201).json({ ok: true, project });
}

export async function listProjects(req: OrgAuthedRequest, res: Response) {
  const projects = await prisma.project.findMany({
    where: { orgId: req.org!.id },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return res.json({ ok: true, projects });
}

export async function getProject(req: OrgAuthedRequest, res: Response) {
  const projectId = req.params.projectId;

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: req.org!.id },
    select: {
      id: true,
      orgId: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      artifacts: { select: { id: true, type: true, title: true } },
    },
  });

  if (!project)
    return res.status(404).json({ ok: false, error: "Project not found" });

  return res.json({ ok: true, project });
}
