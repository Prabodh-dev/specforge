import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

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
