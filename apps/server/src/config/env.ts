import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be set"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be set"),
  // Long-lived on purpose: refreshing used to rotate the refresh token on
  // every single use, which meant any interrupted request (a page reload
  // mid-refresh, two tabs racing) could strand the client with an already
  // -invalidated token and force a real logout. Refresh no longer rotates
  // (see auth.service.ts#refreshSession), so a short access token TTL no
  // longer buys any security margin — it just means silent refreshes
  // happen constantly for no benefit. A week keeps that traffic rare while
  // sessions still end promptly on explicit logout or a password reset.
  JWT_ACCESS_TTL: z.string().default("7d"),
  // The refresh token's DB row already slides its own expiry forward on
  // every use (see auth.service.ts) so an active user is never forced to
  // re-login — but the JWT string itself is signed once at login and its
  // own cryptographic expiry can't be extended without re-issuing it
  // (which would mean rotation, the exact thing removed above). So this
  // needs to be long enough that it practically never fires for anyone
  // who signs in more than once a year; the DB row (revoked on logout or
  // password reset) is what actually ends a session day to day.
  JWT_REFRESH_TTL: z.string().default("400d"),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),

  GROQ_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().default("openai/gpt-oss-120b"),

  QR_SIGNING_PEPPER: z.string().min(8, "QR_SIGNING_PEPPER must be set"),

  RESEND_API_KEY: z.string().optional().default(""),
  RESEND_FROM_EMAIL: z.string().default("Kehai Engine <onboarding@resend.dev>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed. Check .env against .env.example.");
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const aiEnabled = env.GROQ_API_KEY.length > 0;
export const emailEnabled = env.RESEND_API_KEY.length > 0;
export const googleAuthEnabled = env.GOOGLE_CLIENT_ID.length > 0;
