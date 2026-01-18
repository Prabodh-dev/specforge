const API_URL = import.meta.env.VITE_API_URL as string;

export type ApiError = {
  ok: false;
  error: any;
};

export async function apiFetch<T>(
  path: string,
  opts: {
    method?: string;
    token?: string | null;
    orgId?: string | null;
    body?: any;
    query?: Record<string, string | number | boolean | undefined | null>;
    credentials?: RequestCredentials;
  } = {}
): Promise<T> {
  const url = new URL(API_URL + path);

  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.orgId) headers["x-org-id"] = opts.orgId;

  const res = await fetch(url.toString(), {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: opts.credentials ?? "include", // IMPORTANT: refresh cookie works
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = data?.error ?? data ?? { message: res.statusText };
    throw err;
  }

  return data as T;
}
