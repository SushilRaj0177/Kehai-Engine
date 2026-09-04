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
