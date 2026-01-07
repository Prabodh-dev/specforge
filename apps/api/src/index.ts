import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma";
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { orgRouter } from "./routes/org.routes";
import { projectRouter } from "./routes/project.routes";
import { artifactRouter } from "./routes/artifact.routes";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const app = express();

const PORT = Number(process.env.API_PORT || 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(
  cors({
    origin: WEB_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[api] running on http://localhost:${PORT}`);
});

app.get("/db-check", async (_req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ ok: true, users: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "DB connection failed" });
  }
});

app.use("/auth", authRouter);
app.use("/orgs", orgRouter);
app.use("/projects", projectRouter);
app.use("/artifacts", artifactRouter);
