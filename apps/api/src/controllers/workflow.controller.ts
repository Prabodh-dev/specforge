import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { OrgAuthedRequest } from "../middlewares/org";
import { generateWithLLM } from "../llm";
import { WORKFLOW_TO_ARTIFACT, WorkflowKey } from "../llm/types";

const runSchema = z.object({
  idea: z.string().min(10).max(5000),
  targetUsers: z.string().max(300).optional(),
  constraints: z.array(z.string().max(200)).optional(),
  techStack: z.array(z.string().max(100)).optional(),
  notes: z.string().max(2000).optional(),
});

export async function runWorkflow(req: OrgAuthedRequest, res: Response) {
  const projectId = req.params.projectId;
  const workflowKey = req.params.workflowKey as WorkflowKey;

  if (!WORKFLOW_TO_ARTIFACT[workflowKey]) {
    return res.status(400).json({ ok: false, error: "Invalid workflowKey" });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: req.org!.id },
    select: { id: true },
  });
  if (!project)
    return res.status(404).json({ ok: false, error: "Project not found" });

  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const artifactType = WORKFLOW_TO_ARTIFACT[workflowKey];

  const t0 = Date.now();
  const llmResult = await generateWithLLM(artifactType, parsed.data);
  const latencyMs = Date.now() - t0;

  const run = await prisma.lLMRun.create({
    data: {
      projectId,
      workflowKey,
      createdById: req.user!.id,
      inputTokens: llmResult.meta?.inputTokens,
      outputTokens: llmResult.meta?.outputTokens,
      costUsd: llmResult.meta?.costUsd,
      latencyMs: llmResult.meta?.latencyMs ?? latencyMs,
    },
    select: { id: true, createdAt: true },
  });

  const review = await prisma.reviewItem.create({
    data: {
      projectId,
      artifactType,
      status: "PENDING",
      inputJson: parsed.data,
      outputText: llmResult.outputText ?? null,
      outputJson: llmResult.outputJson ?? null,
      createdById: req.user!.id,
    },
    select: { id: true, status: true, artifactType: true, createdAt: true },
  });

  return res.status(201).json({
    ok: true,
    run,
    review,
    preview: llmResult.outputText ?? llmResult.outputJson,
  });
}
