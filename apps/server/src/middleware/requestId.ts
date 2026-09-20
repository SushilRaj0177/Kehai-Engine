import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * The only way to connect "this request failed" in an access log line to
 * the stack trace the error handler printed for it — a support report that
 * says "it broke around 3pm" is otherwise unmatchable to a specific error
 * in a log stream full of concurrent requests. Trusts an incoming
 * X-Request-Id (useful if this ever sits behind a proxy that already
 * assigns one) and generates one otherwise; always echoed back so a client
 * can quote it when reporting an issue.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = (req.headers["x-request-id"] as string | undefined) || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
}
