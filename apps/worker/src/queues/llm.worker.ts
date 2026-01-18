import { Worker } from "bullmq";
import { getRedisConnection } from "./redis";
import { prisma } from "../lib/prisma";
import { geminiGenerate } from "../llm/gemini";
import { extractJsonLoose } from "../llm/json";

export const LLM_QUEUE_NAME = "llm-runs";

function workflowMeta(workflowKey: string) {
  switch (workflowKey) {
    case "GENERATE_PRD":
      return { isJson: false };
    case "GENERATE_OPENAPI":
    case "GENERATE_USER_STORIES":
    case "GENERATE_DB_SCHEMA":
    case "GENERATE_TASK_BREAKDOWN":
      return { isJson: true };
    default:
      throw new Error(`Unknown workflowKey: ${workflowKey}`);
  }
}

function buildPrompt(workflowKey: string, idea: string) {
  const base = `
You are SpecForge — an industry-grade product spec generator.

Product idea:
${idea}

Rules:
- Be practical, not generic.
- If JSON is expected, output ONLY valid JSON (no markdown/backticks).
`;

  if (workflowKey === "GENERATE_PRD") {
    return (
      base +
      `
Generate a PRD in Markdown with:
- Problem, goals, non-goals
- Personas, journeys
- Functional requirements
- Non-functional requirements
- Edge cases
- Metrics, rollout
`
    );
  }

  if (workflowKey === "GENERATE_OPENAPI") {
    return (
      base +
      `
Return OpenAPI 3.1 JSON for core APIs: auth, orgs, projects, artifacts, versions, reviews, exports.
Return ONLY JSON.
`
    );
  }

  if (workflowKey === "GENERATE_USER_STORIES") {
    return (
      base +
      `
Return JSON:
{ "epics": string[], "stories": [{ "id","title","asA","iWant","soThat","acceptanceCriteria": string[] }] }
10-18 stories.
`
    );
  }

  if (workflowKey === "GENERATE_DB_SCHEMA") {
    return (
      base +
      `
Return JSON:
{ "tables": [{ "name": string, "columns": [{ "name","type","nullable","primary","unique","references"?:{table,column}}], "indexes"?: string[] }] }
`
    );
  }

  if (workflowKey === "GENERATE_TASK_BREAKDOWN") {
    return (
      base +
      `
Return JSON:
{ "phases": [{ "name": string, "tasks": [{ "id","title","description","estimateHours"?: number }] }] }
`
    );
  }

  return base;
}

const connection = getRedisConnection();

if (connection) {
  new Worker(
    LLM_QUEUE_NAME,
    async (job) => {
      const { llmRunId } = job.data as { llmRunId: string };

      const run = await prisma.lLMRun.findUnique({ where: { id: llmRunId } });
      if (!run) throw new Error("LLMRun not found");

      // idempotent
      const existing = await prisma.reviewItem.findFirst({
        where: { llmRunId: run.id },
      });
      if (existing) return { ok: true, skipped: true };

      await prisma.lLMRun.update({
        where: { id: run.id },
        data: { status: "PROCESSING", error: null },
      });

      const meta = workflowMeta(run.workflowKey);
      const idea =
        run.inputText ?? JSON.stringify(run.inputJson ?? {}, null, 2);
      const prompt = buildPrompt(run.workflowKey, idea);

      try {
        const raw = await geminiGenerate({ prompt });

        let proposedContentText: string | null = null;
        let proposedContentJson: any | null = null;

        if (!meta.isJson) proposedContentText = raw;
        else proposedContentJson = extractJsonLoose(raw);

        await prisma.reviewItem.create({
          data: {
            orgId: run.orgId,
            projectId: run.projectId,
            artifactId: run.artifactId,
            llmRunId: run.id,
            status: "PENDING",
            proposedContentText,
            proposedContentJson,
            createdById: run.createdById ?? null,
          },
        });

        await prisma.lLMRun.update({
          where: { id: run.id },
          data: { status: "DONE" },
        });
        return { ok: true };
      } catch (e: any) {
        await prisma.lLMRun.update({
          where: { id: run.id },
          data: { status: "FAILED", error: e?.message ?? "LLM failed" },
        });
        throw e;
      }
    },
    { connection, concurrency: 2 }
  );

  console.log("[worker] LLM queue consumer online");
} else {
  console.log("[worker] LLM queue consumer disabled (no Redis)");
}
