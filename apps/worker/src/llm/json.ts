export function extractJsonLoose(text: string) {
  // best-effort: find first {...} or [...]
  const firstObj = text.indexOf("{");
  const firstArr = text.indexOf("[");
  const start = [firstObj, firstArr]
    .filter((x) => x >= 0)
    .sort((a, b) => a - b)[0];

  if (start === undefined) throw new Error("No JSON start found in LLM output");

  const trimmed = text.slice(start).trim();

  // try full parse first
  try {
    return JSON.parse(trimmed);
  } catch {}

  // fallback: attempt to cut at last brace/bracket
  const lastObj = trimmed.lastIndexOf("}");
  const lastArr = trimmed.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (end <= 0) throw new Error("No JSON end found in LLM output");

  return JSON.parse(trimmed.slice(0, end + 1));
}
