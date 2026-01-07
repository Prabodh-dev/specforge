import { ArtifactType, LLMResult, WorkflowInput } from "./types";

export async function mockGenerate(
  type: ArtifactType,
  input: WorkflowInput
): Promise<LLMResult> {
  const base = {
    model: "mock-llm",
    inputTokens: 123,
    outputTokens: 456,
    latencyMs: 150,
    costUsd: 0,
  };

  if (type === "PRD") {
    return {
      outputText: `# PRD\n\n## Idea\n${input.idea}\n\n## Target Users\n${input.targetUsers || "General users"}\n\n## Goals\n- Clear problem statement\n- MVP scope\n- Success metrics\n\n## Non-goals\n- Anything outside MVP\n\n## Constraints\n${(input.constraints || ["Time: 2 weeks"]).map((c) => `- ${c}`).join("\n")}\n`,
      meta: base,
    };
  }

  if (type === "USER_STORIES") {
    return {
      outputText: `# User Stories\n\n1) As a user, I want to sign up/login so I can access the workspace.\n   - AC: Valid email/password, JWT issued.\n\n2) As a PM, I want to create a project so I can manage PRD/specs.\n   - AC: Project created with default artifacts.\n\n3) As a reviewer, I want to approve generated outputs so only verified specs go to versions.\n   - AC: Approve creates a new artifact version.\n`,
      meta: base,
    };
  }

  if (type === "OPENAPI") {
    return {
      outputJson: {
        openapi: "3.0.3",
        info: { title: "SpecForge API", version: "1.0.0" },
        paths: {
          "/auth/login": {
            post: {
              summary: "Login",
              requestBody: { required: true },
              responses: { "200": { description: "OK" } },
            },
          },
          "/projects": {
            get: {
              summary: "List projects",
              responses: { "200": { description: "OK" } },
            },
            post: {
              summary: "Create project",
              responses: { "201": { description: "Created" } },
            },
          },
        },
      },
      meta: base,
    };
  }

  if (type === "DB_SCHEMA") {
    return {
      outputJson: {
        tables: [
          {
            name: "users",
            fields: ["id", "email", "passwordHash", "createdAt"],
          },
          { name: "orgs", fields: ["id", "name", "slug", "createdAt"] },
          { name: "projects", fields: ["id", "orgId", "name", "createdAt"] },
        ],
        indexes: [{ table: "users", fields: ["email"], unique: true }],
      },
      meta: base,
    };
  }

  // TASK_BREAKDOWN
  return {
    outputText: `# Task Breakdown\n\n## Backend\n- Auth endpoints\n- Org + RBAC\n- Project + artifacts\n- Review queue approve/reject\n\n## Frontend\n- Dashboard\n- Editor\n- Review queue UI\n\n## DevOps\n- Deploy API/Worker on Railway\n- Deploy Web on Vercel\n`,
    meta: base,
  };
}
