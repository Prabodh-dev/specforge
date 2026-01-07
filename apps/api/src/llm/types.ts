export type WorkflowKey =
  | "GENERATE_PRD"
  | "GENERATE_USER_STORIES"
  | "GENERATE_OPENAPI"
  | "GENERATE_DB_SCHEMA"
  | "GENERATE_TASK_BREAKDOWN";

export type ArtifactType =
  | "PRD"
  | "USER_STORIES"
  | "OPENAPI"
  | "DB_SCHEMA"
  | "TASK_BREAKDOWN";

export const WORKFLOW_TO_ARTIFACT: Record<WorkflowKey, ArtifactType> = {
  GENERATE_PRD: "PRD",
  GENERATE_USER_STORIES: "USER_STORIES",
  GENERATE_OPENAPI: "OPENAPI",
  GENERATE_DB_SCHEMA: "DB_SCHEMA",
  GENERATE_TASK_BREAKDOWN: "TASK_BREAKDOWN",
};

export type WorkflowInput = {
  idea: string;
  targetUsers?: string;
  constraints?: string[];
  techStack?: string[];
  notes?: string;
};

export type LLMResult = {
  outputText?: string;
  outputJson?: any;
  meta?: {
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    costUsd?: number;
  };
};
