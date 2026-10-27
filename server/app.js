import express from "express";
import helmet from "helmet";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.routes.js";
import authorRoutes from "./routes/author.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { apiLimiter } from "./middleware/rate-limits.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://127.0.0.1:5173");
}

app.disable("x-powered-by");
app.use(helmet());
app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS" && req.path.startsWith("/api/")) {
    return res.sendStatus(origin && allowedOrigins.has(origin) ? 204 : 403);
  }
  next();
});
app.use(express.json({ limit: "16kb" }));
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", authorRoutes);
app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found." }));

const clientDist = path.resolve(here, "..", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*splat", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use(errorHandler);

export default app;
