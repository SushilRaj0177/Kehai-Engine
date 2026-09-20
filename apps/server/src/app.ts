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
import { classroomRouter } from "./routes/classroom.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { auditRouter } from "./routes/audit.routes.js";
import { prisma } from "./lib/prisma.js";

// WEB_ORIGIN is pasted by hand into the hosting dashboard, so tolerate a
// trailing slash or stray whitespace instead of failing an exact string
// match on it — a difference invisible in the dashboard's input box was
// silently breaking every credentialed request (CORS rejects on the
// client side with no server-side error to log, hence "genuinely broken"
// with no logs to point at). Also accepts a comma-separated list so
// multiple frontends (e.g. a Vercel preview alongside production) can be
// allowed without another deploy.
const allowedOrigins = env.WEB_ORIGIN.split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  return allowedOrigins.includes(origin.trim().replace(/\/+$/, ""));
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header at all (curl, server-to-server, same-origin) —
        // nothing to check against, let it through.
        if (!origin || isAllowedOrigin(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(isProd ? "combined" : "dev"));
  app.use(apiRateLimit);

  // Render uses this as its healthCheckPath to decide whether to route
  // traffic to (and keep alive) this instance — a health check that
  // always returns "ok" would keep sending real requests to an instance
  // that can't actually serve any of them if the database is unreachable
  // (network partition, exhausted connection pool, rotated credentials).
  // Bounded so a slow-but-not-dead database doesn't hang the check itself.
  app.get("/health", async (_req, res) => {
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("db health check timed out")), 3000)),
      ]);
      res.json({ status: "ok", service: "kehai-engine-api" });
    } catch (err) {
      res.status(503).json({
        status: "error",
        service: "kehai-engine-api",
        detail: "database unreachable",
      });
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/orgs", orgRouter);
  app.use("/api/events", eventRouter);
  app.use("/api/attendance", attendanceRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/qr", qrRouter);
  app.use("/api/classrooms", classroomRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/audit", auditRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
