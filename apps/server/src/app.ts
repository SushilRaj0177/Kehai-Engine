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
