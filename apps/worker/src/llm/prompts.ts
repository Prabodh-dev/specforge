export function buildPrompt(args: { workflowKey: string; idea: string }) {
  const base = `
You are SpecForge — an industry-grade product spec generator.

Product idea:
${args.idea}

Rules:
- Output must be clean, concise, real-world, not generic.
- If JSON is expected, output ONLY valid JSON (no markdown, no backticks).
- Use practical naming, realistic acceptance criteria, sensible tables/columns.
`;

  switch (args.workflowKey) {
    case "GENERATE_PRD":
      return (
        base +
        `
Generate a PRD with:
- Problem, goals, non-goals
- Personas
- User journeys
- Functional requirements
- Non-functional requirements
- Edge cases
- Metrics & rollout plan
`
      );
    case "GENERATE_USER_STORIES":
      return (
        base +
        `
Generate user stories in the required JSON schema. Keep 10–18 stories.
`
      );
    case "GENERATE_OPENAPI":
      return (
        base +
        `
Generate OpenAPI 3.1 JSON for core APIs (auth/org/projects/artifacts/reviews/exports).
Return ONLY JSON.
`
      );
    case "GENERATE_DB_SCHEMA":
      return (
        base +
        `
Generate DB schema in the required JSON schema (tables/columns/references).
`
      );
    case "GENERATE_TASK_BREAKDOWN":
      return (
        base +
        `
Generate tasks split by phases (backend, worker, frontend, deploy).
`
      );
    default:
      return base + `Unknown workflowKey: ${args.workflowKey}`;
  }
}
