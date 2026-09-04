import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env, isProd } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { authRouter } from "./routes/auth.routes.js";
import { orgRouter } from "./routes/org.routes.js";
import { eventRouter } from "./routes/event.routes.js";
import { attendanceRouter } from "./routes/attendance.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { exportRouter } from "./routes/export.routes.js";
import { qrRouter } from "./routes/qr.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(isProd ? "combined" : "dev"));
  app.use(apiRateLimit);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "kehai-engine-api" }));

  app.use("/api/auth", authRouter);
  app.use("/api/orgs", orgRouter);
  app.use("/api/events", eventRouter);
  app.use("/api/attendance", attendanceRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/qr", qrRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
