import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { clearRefreshCookie, setRefreshCookie } from "../utils/cookies";
import { AuthedRequest } from "../middlewares/auth";

const registerSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists)
    return res.status(409).json({ ok: false, error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true },
  });

  const accessToken = signAccessToken({ sub: user.id });
  const refreshToken = signRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  return res.status(201).json({ ok: true, user, accessToken });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok)
    return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const accessToken = signAccessToken({ sub: user.id });
  const refreshToken = signRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  return res.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refresh_token as string | undefined;
  if (!token)
    return res.status(401).json({ ok: false, error: "Missing refresh token" });

  try {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user)
      return res
        .status(401)
        .json({ ok: false, error: "Invalid refresh token" });

    const accessToken = signAccessToken({ sub: user.id });
    return res.json({ ok: true, accessToken });
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid refresh token" });
  }
}

export async function logout(_req: Request, res: Response) {
  clearRefreshCookie(res);
  return res.json({ ok: true });
}

export async function me(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return res.json({ ok: true, user });
}
