import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

export type AuthedRequest = Request & {
  user?: {
    id: string;
    orgId?: string;
    role?: string;
  };
};

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token)
    return res.status(401).json({ ok: false, error: "Missing access token" });

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, orgId: payload.orgId, role: payload.role };
    return next();
  } catch {
    return res
      .status(401)
      .json({ ok: false, error: "Invalid or expired token" });
  }
}
