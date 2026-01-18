import { prisma } from "../../lib/prisma";
import { enqueueLLMRun } from "../../queues/llm.queue";

function workflowToArtifactType(workflowKey: string) {
  switch (workflowKey) {
    case "GENERATE_PRD":
      return "PRD";
    case "GENERATE_USER_STORIES":
      return "USER_STORIES";
    case "GENERATE_OPENAPI":
      return "OPENAPI";
    case "GENERATE_DB_SCHEMA":
      return "DB_SCHEMA";
    case "GENERATE_TASK_BREAKDOWN":
      return "TASKS";
    default:
      throw new Error("Invalid workflowKey");
  }
}

export async function runWorkflow(req: any, res: any) {
  const { projectId, workflowKey } = req.params;
  const orgId = req.orgId;
  const userId = req.user?.id;

  const { idea } = req.body as { idea: string };
  if (!idea?.trim())
    return res.status(400).json({ ok: false, error: "idea is required" });

  const artifactType = workflowToArtifactType(workflowKey);

  const artifact = await prisma.artifact.findFirst({
    where: { orgId, projectId, type: artifactType },
  });
  if (!artifact)
    return res
      .status(404)
      .json({ ok: false, error: "Artifact not found for workflow" });

  const run = await prisma.lLMRun.create({
    data: {
      orgId,
      projectId,
      artifactId: artifact.id,
      workflowKey,
      status: "QUEUED",
      inputText: idea,
      createdById: userId ?? null,
    },
  });

  await enqueueLLMRun(run.id);

  return res.json({ ok: true, llmRunId: run.id });
}
