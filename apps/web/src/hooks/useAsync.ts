import React, { useState } from "react";

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = [],
) {
  const [state, setState] = useState<{
    loading: boolean;
    data: T | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  const execute = React.useCallback(async () => {
    setState({ loading: true, data: null, error: null });
    try {
      const result = await fn();
      setState({ loading: false, data: result, error: null });
      return result;
    } catch (e) {
      const msg = formatErr(e);
      setState({ loading: false, data: null, error: msg });
      throw e;
    }
  }, deps);

  return { ...state, execute };
}

function formatErr(e: any): string {
  if (typeof e === "string") return e;
  if (e?.fieldErrors) {
    const parts: string[] = [];
    for (const [field, msgs] of Object.entries(e.fieldErrors as any)) {
      if (Array.isArray(msgs)) parts.push(`${field}: ${msgs.join("; ")}`);
    }
    if (parts.length) return parts.join(" • ");
  }
  if (e?.message) return e.message;
  if (e?.error?.message) return e.error.message;
  return "Something went wrong";
}
