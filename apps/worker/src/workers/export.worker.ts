import path from "path";
import fs from "fs";
import { Worker } from "bullmq";
import JSZip from "jszip";
import { prisma } from "../lib/prisma";
import { getRedisConnection } from "../queues/redis";
import { r2Enabled, uploadToR2 } from "../lib/r2";

export const EXPORT_QUEUE_NAME = "exports";

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function getLatestArtifact(projectId: string, type: any) {
  const artifact = await prisma.artifact.findFirst({
    where: { projectId, type },
    select: { id: true },
  });
  if (!artifact) return null;

  const latest = await prisma.artifactVersion.findFirst({
    where: { artifactId: artifact.id },
    orderBy: { version: "desc" },
    select: { contentText: true, contentJson: true, version: true },
  });
  return latest ?? null;
}

function asJsonFile(obj: any) {
  return Buffer.from(JSON.stringify(obj ?? {}, null, 2), "utf-8");
}

function asTextFile(txt: string) {
  return Buffer.from(txt ?? "", "utf-8");
}

async function buildExportBuffer(projectId: string, type: string) {
  if (type === "PRD_MD") {
    const prd = await getLatestArtifact(projectId, "PRD");
    if (!prd?.contentText) throw new Error("No PRD content to export");
    return {
      buf: asTextFile(prd.contentText),
      contentType: "text/markdown",
      ext: "md",
    };
  }

  if (type === "API_SPEC_JSON") {
    const a = await getLatestArtifact(projectId, "API_SPEC");
    if (!a?.contentJson) throw new Error("No API_SPEC JSON to export");
    return {
      buf: asJsonFile(a.contentJson),
      contentType: "application/json",
      ext: "json",
    };
  }

  if (type === "DB_SCHEMA_JSON") {
    const a = await getLatestArtifact(projectId, "DB_SCHEMA");
    if (!a?.contentJson) throw new Error("No DB_SCHEMA JSON to export");
    return {
      buf: asJsonFile(a.contentJson),
      contentType: "application/json",
      ext: "json",
    };
  }

  if (type === "SCAFFOLD_ZIP") {
    const zip = new JSZip();

    const prd = await getLatestArtifact(projectId, "PRD");
    const stories = await getLatestArtifact(projectId, "USER_STORIES");
    const openapi = await getLatestArtifact(projectId, "API_SPEC");
    const db = await getLatestArtifact(projectId, "DB_SCHEMA");
    const tasks = await getLatestArtifact(projectId, "TASK_BREAKDOWN");

    zip.file(
      "README.md",
      `# SpecForge Scaffold

Generated from approved artifacts.

## Quickstart
\`\`\`bash
pnpm i
pnpm dev
\`\`\`

## Docs
- docs/prd.md
- docs/user_stories.json
- spec/openapi.json
- spec/db_schema.json
- spec/tasks.json
`,
    );

    zip.file(
      "pnpm-workspace.yaml",
      `packages:
  - apps/*
`,
    );

    zip.file(
      "package.json",
      JSON.stringify(
        {
          name: "specforge-scaffold",
          private: true,
          version: "0.0.0",
          packageManager: "pnpm@9.15.0",
          scripts: {
            dev: "pnpm -r --parallel dev",
            build: "pnpm -r build",
          },
        },
        null,
        2,
      ),
    );

    zip.file(
      ".env.example",
      `# API
API_PORT=4000

# Optional: if you later add DB
DATABASE_URL="postgresql://user:pass@localhost:5432/app"
`,
    );

    zip.file("docs/prd.md", prd?.contentText ?? "");
    zip.file(
      "docs/user_stories.json",
      JSON.stringify(stories?.contentJson ?? {}, null, 2),
    );
    zip.file(
      "spec/openapi.json",
      JSON.stringify(openapi?.contentJson ?? {}, null, 2),
    );
    zip.file(
      "spec/db_schema.json",
      JSON.stringify(db?.contentJson ?? {}, null, 2),
    );
    zip.file(
      "spec/tasks.json",
      JSON.stringify(tasks?.contentJson ?? {}, null, 2),
    );

    zip.file(
      "apps/api/package.json",
      JSON.stringify(
        {
          name: "@scaffold/api",
          private: true,
          type: "module",
          version: "0.0.0",
          scripts: {
            dev: "tsx watch src/index.ts",
            build: "tsc -p tsconfig.json",
            start: "node dist/index.js",
          },
          dependencies: {
            express: "^4.19.2",
            cors: "^2.8.5",
            helmet: "^7.1.0",
          },
          devDependencies: {
            typescript: "^5.7.3",
            tsx: "^4.16.2",
            "@types/express": "^4.17.21",
            "@types/cors": "^2.8.17",
          },
        },
        null,
        2,
      ),
    );

    zip.file(
      "apps/api/tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "Bundler",
            outDir: "dist",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ["src"],
        },
        null,
        2,
      ),
    );

    zip.file(
      "apps/api/src/index.ts",
      `import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api", time: new Date().toISOString() });
});

app.get("/openapi.json", (_req, res) => {
  res.sendFile(process.cwd() + "/../../spec/openapi.json");
});

app.listen(PORT, () => console.log(\`[api] running on http://localhost:\${PORT}\`));
`,
    );

    zip.file(
      "apps/web/package.json",
      JSON.stringify(
        {
          name: "@scaffold/web",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "tsc -b && vite build",
            preview: "vite preview",
          },
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1",
          },
          devDependencies: {
            "@types/react": "^18.3.3",
            "@types/react-dom": "^18.3.0",
            "@vitejs/plugin-react": "^4.3.1",
            typescript: "^5.7.3",
            vite: "^7.3.0",
          },
        },
        null,
        2,
      ),
    );

    zip.file(
      "apps/web/tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            moduleResolution: "Bundler",
            jsx: "react-jsx",
            strict: true,
            skipLibCheck: true,
          },
          include: ["src"],
        },
        null,
        2,
      ),
    );

    zip.file(
      "apps/web/vite.config.ts",
      `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });
`,
    );

    zip.file(
      "apps/web/index.html",
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SpecForge Scaffold</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    );

    zip.file(
      "apps/web/src/main.tsx",
      `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    );

    zip.file(
      "apps/web/src/App.tsx",
      `export default function App() {
  return (
    <div style={{ fontFamily: "system-ui", padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>SpecForge Scaffold</h1>
      <p>This repo was generated from approved artifacts.</p>
      <ul>
        <li><code>/docs/prd.md</code></li>
        <li><code>/spec/openapi.json</code></li>
        <li><code>/spec/db_schema.json</code></li>
        <li><code>/spec/tasks.json</code></li>
      </ul>
      <p>Run:</p>
      <pre>pnpm i{"\\n"}pnpm dev</pre>
    </div>
  );
}
`,
    );

    const buf = await zip.generateAsync({ type: "nodebuffer" });
    return { buf, contentType: "application/zip", ext: "zip" };
  }

  throw new Error(`Unknown export type: ${type}`);
}

export function startExportWorker() {
  const connection = getRedisConnection();

  if (!connection) {
    console.log("[worker] Export worker disabled (no Redis)");
    return;
  }

  const worker = new Worker(
    EXPORT_QUEUE_NAME,
    async (job) => {
      const { exportId } = job.data as { exportId: string };

      const file = await prisma.exportFile.findUnique({
        where: { id: exportId },
      });
      if (!file) return;

      await prisma.exportFile.update({
        where: { id: exportId },
        data: { status: "PROCESSING", error: null },
      });

      try {
        const { buf, contentType, ext } = await buildExportBuffer(
          file.projectId,
          file.type,
        );

        const key = `exports/${file.projectId}/${exportId}.${ext}`;

        let publicUrl: string | null = null;

        if (r2Enabled()) {
          publicUrl = await uploadToR2(key, buf, contentType);
          await prisma.exportFile.update({
            where: { id: exportId },
            data: {
              status: "DONE",
              r2Key: key,
              publicUrl,
              completedAt: new Date(),
            },
          });
          return;
        }

        const localRoot = path.resolve(process.cwd(), "../../tmp/exports");

        ensureDir(path.join(localRoot, path.dirname(key)));
        const localPath = path.join(localRoot, key);
        fs.writeFileSync(localPath, buf);

        await prisma.exportFile.update({
          where: { id: exportId },
          data: {
            status: "DONE",
            r2Key: key, // reused as local path key
            publicUrl: null,
            completedAt: new Date(),
          },
        });
      } catch (e: any) {
        await prisma.exportFile.update({
          where: { id: exportId },
          data: { status: "FAILED", error: e?.message ?? "Export failed" },
        });
        throw e;
      }
    },
    { connection },
  );

  worker.on("ready", () => console.log("[worker] export worker ready"));
  worker.on("failed", (_job, err) =>
    console.log("[worker] export failed", err?.message),
  );
}
