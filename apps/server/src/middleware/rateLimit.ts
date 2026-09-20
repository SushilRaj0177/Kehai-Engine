import rateLimit from "express-rate-limit";

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many auth attempts, try again later." } },
});

export const attendanceRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many check-in attempts, slow down." } },
});

export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many AI requests, slow down." } },
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Keyed per-user (not per-IP like the limiters above): a join code is 6
// chars from a 33-char alphabet — a huge keyspace on its own, but a wrong
// guess returns a distinguishable 404, making this a clean online oracle
// for a scripted attacker. Keying by IP alone lets an attacker spread
// guesses across addresses; every guess still requires being logged in as
// *some* account, so tying the limit to that account closes that gap.
// Must run after requireAuth so req.user is populated.
export const joinCodeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).user?.id ?? req.ip,
  message: { error: { code: "RATE_LIMITED", message: "Too many join attempts, try again later." } },
});
