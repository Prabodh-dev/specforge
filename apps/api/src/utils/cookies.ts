import { Response } from "express";
import { env } from "../config/env";

const isProd = env.NODE_ENV === "production";

export function setRefreshCookie(res: Response, token: string) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie("refresh_token", {
    path: "/",
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
}
