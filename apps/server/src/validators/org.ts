import { z } from "zod";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export { slugify };

export const inviteMemberSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(["ADMIN", "ORGANIZER", "VIEWER"]).default("ORGANIZER"),
});

export const updateWebhookSchema = z.object({
  // Empty string clears it — the frontend sends "" rather than omitting the
  // field so "save with the box empty" reliably means "remove the webhook".
  webhookUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\//.test(v), "Webhook URL must start with https://")
    .transform((v) => (v === "" ? null : v)),
});
