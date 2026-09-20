import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";
import { isProd } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { captureException } from "../lib/errorTracking.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.flatten() },
    });
  }

  // Only genuinely unexpected errors reach here (HttpError/ZodError, the
  // two "this is a normal 4xx" cases, are handled above) — worth a
  // structured log line and an error-tracking report, both correlatable
  // to the request via requestId if someone reports "it broke."
  logger.error("Unhandled request error", { requestId: req.id, method: req.method, path: req.path, err: String(err) });
  captureException(err, { requestId: req.id, method: req.method, path: req.path });

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
      requestId: req.id,
      details: isProd ? undefined : String(err),
    },
  });
}

export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
