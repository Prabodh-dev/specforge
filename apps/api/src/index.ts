import "./config/loadEnv";
import dotenv from "dotenv";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma";
import { authRouter } from "./routes/auth.routes";
import { orgRouter } from "./routes/org.routes";
import { projectRouter } from "./routes/project.routes";
import { artifactRouter } from "./routes/artifact.routes";
import { workflowRouter } from "./routes/workflow.routes";
import { reviewRouter } from "./routes/review.routes";
import { exportRouter } from "./routes/export.routes";
import { downloadExport } from "./controllers/export.controller";
import { reviewsRouter } from "./modules/reviews";
import { checkLLMProvider } from "./llm/index";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const app = express();

const PORT = Number(process.env.API_PORT || 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN || [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(helmet());
app.use(
  cors({
    origin: WEB_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api", time: new Date().toISOString() });
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

app.get("/llm-health", async (_req, res) => {
  try {
    const health = await checkLLMProvider();
    const statusCode = health.status === "ok" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err) {
    console.error(err);
    res.status(503).json({
      status: "error",
      provider: "unknown",
      message: "LLM health check failed",
    });
  }
});
// Public download endpoint (no auth) to avoid auth middleware conflicts
app.get("/download/:id", (req, res) => downloadExport(req as any, res));

// ✅ Mount routers TOP LEVEL (not inside any route)
app.use("/auth", authRouter);
app.use("/orgs", orgRouter);
app.use("/projects", projectRouter);
app.use("/artifacts", artifactRouter);

// these were already root-mounted in your code
app.use(workflowRouter);
app.use(reviewRouter);
app.use(exportRouter);

// ✅ NEW: Review Queue APIs (/reviews, /reviews/:id, approve/reject)
app.use(reviewsRouter);

app.listen(PORT, () => {
  console.log(`[api] running on http://localhost:${PORT}`);
});
