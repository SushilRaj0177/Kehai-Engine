import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be set"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be set"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),

  GROQ_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().default("openai/gpt-oss-120b"),

  QR_SIGNING_PEPPER: z.string().min(8, "QR_SIGNING_PEPPER must be set"),
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
export const googleAuthEnabled = env.GOOGLE_CLIENT_ID.length > 0;
