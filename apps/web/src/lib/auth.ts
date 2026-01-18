import { apiFetch } from "./api";

export type User = {
  id: string;
  name?: string | null;
  email: string;
  createdAt?: string;
};

export async function registerApi(input: {
  name?: string;
  email: string;
  password: string;
}) {
  return apiFetch<{ ok: true; user: User; accessToken: string }>(
    "/auth/register",
    {
      method: "POST",
      body: input,
    }
  );
}

export async function loginApi(input: { email: string; password: string }) {
  return apiFetch<{ ok: true; user: User; accessToken: string }>(
    "/auth/login",
    {
      method: "POST",
      body: input,
    }
  );
}

export async function refreshApi() {
  return apiFetch<{ ok: true; accessToken: string }>("/auth/refresh", {
    method: "POST",
  });
}

export async function meApi(token: string) {
  return apiFetch<{ ok: true; user: User }>("/auth/me", {
    token,
    method: "GET",
  });
}

export async function logoutApi() {
  return apiFetch<{ ok: true }>("/auth/logout", { method: "POST" });
}
