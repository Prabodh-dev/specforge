import { llmGenerate } from "../llm";
import { jsonSchemas } from "../llm/schemas";

import { prisma } from "../lib/prisma";

const workflowToArtifact = (key: string) => {
  if (key === "GENERATE_PRD") return { type: "PRD", isJson: false };
  if (key === "GENERATE_USER_STORIES")
    return {
      type: "USER_STORIES",
      isJson: true,
      schemaKey: "USER_STORIES" as const,
    };
  if (key === "GENERATE_DB_SCHEMA")
    return { type: "DB_SCHEMA", isJson: true, schemaKey: "DB_SCHEMA" as const };
  if (key === "GENERATE_TASK_BREAKDOWN")
    return { type: "TASKS", isJson: true, schemaKey: "TASKS" as const };
  if (key === "GENERATE_API_SPEC")
    return { type: "API_SPEC", isJson: true, schemaKey: null as any };
  throw new Error(`Unknown workflowKey: ${key}`);
};

export async function processLLMRun(llmRunId: string) {
  const run = await prisma.lLMRun.findUnique({ where: { id: llmRunId } });
  if (!run) throw new Error("LLMRun not found");

  const cfg = workflowToArtifact(run.workflowKey);

  const prompt = `
You are SpecForge. Generate output for workflow: ${run.workflowKey}

Product idea:
${run.inputText ?? JSON.stringify(run.inputJson ?? {}, null, 2)}

Rules:
- Be clean, industry-grade.
- If JSON is expected, output ONLY valid JSON.
`;

  const text = await llmGenerate({
    prompt,
    jsonSchema: cfg.schemaKey ? (jsonSchemas as any)[cfg.schemaKey] : undefined,
  });

  let proposedText: string | null = null;
  let proposedJson: any | null = null;

  if (!cfg.isJson) {
    proposedText = text;
  } else {
    proposedJson = JSON.parse(text);
  }

  await prisma.reviewItem.create({
    data: {
      orgId: run.orgId,
      projectId: run.projectId,
      artifactId: run.artifactId,
      status: "PENDING",
      proposedContentText: proposedText,
      proposedContentJson: proposedJson,
      llmRunId: run.id,
    },
  });

  await prisma.lLMRun.update({
    where: { id: run.id },
    data: { status: "DONE" },
  });
}
