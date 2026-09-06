import { z } from "zod";

const geofenceAllOrNothing = (d: {
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusM?: number | null;
}) => {
  const present = [d.latitude, d.longitude, d.geofenceRadiusM].filter((v) => v !== undefined && v !== null);
  return present.length === 0 || present.length === 3;
};

const GEOFENCE_REFINE = {
  message: "latitude, longitude, and geofenceRadiusM must all be provided together, or all omitted",
  path: ["latitude"] as (string | number)[],
};

export const createClassroomSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    courseCode: z.string().trim().max(40).optional(),
    semesterLabel: z.string().trim().max(60).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    geofenceRadiusM: z.coerce.number().int().min(10).max(5000).optional(),
  })
  .refine(geofenceAllOrNothing, GEOFENCE_REFINE);

export const updateClassroomSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    courseCode: z.string().trim().max(40).optional(),
    semesterLabel: z.string().trim().max(60).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    geofenceRadiusM: z.coerce.number().int().min(10).max(5000).optional(),
  })
  .refine(geofenceAllOrNothing, GEOFENCE_REFINE);

export const joinClassroomSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => s.length === 6, { message: "Join code must be exactly 6 characters" }),
});

export const classCheckInSchema = z.object({
  qrToken: z.string().min(10),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  accuracyMeters: z.coerce.number().min(0).max(100000).optional(),
});
