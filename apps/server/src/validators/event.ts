import { z } from "zod";

export const createEventSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    description: z.string().trim().max(5000).optional(),
    venue: z.string().trim().min(2).max(200),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    registrationOpensAt: z.coerce.date().optional().nullable(),
    registrationClosesAt: z.coerce.date().optional().nullable(),
    attendanceOpensMinutesBefore: z.coerce.number().int().min(0).max(720).default(30),
    attendanceClosesMinutesAfter: z.coerce.number().int().min(0).max(720).default(30),
    capacity: z.coerce.number().int().positive().optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    geofenceRadiusM: z.coerce.number().int().min(10).max(5000).default(100),
    qrRotationSeconds: z.coerce.number().int().min(5).max(300).default(20),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const updateEventSchema = createEventSchema.innerType().partial();

export const eventStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ACTIVE", "COMPLETED", "CANCELLED"]),
});

export const geofenceCheckSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().min(0).max(100000).optional(),
});

export const checkInSchema = z.object({
  qrToken: z.string().min(10),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().min(0).max(100000).optional(),
});
