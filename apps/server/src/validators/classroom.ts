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
    // Nullable, not just optional — the edit panel needs to be able to
    // clear a previously-set course code or semester label, which only an
    // explicit `null` can express: omitting the key from a PATCH leaves
    // the old value untouched.
    courseCode: z.string().trim().max(40).optional().nullable(),
    semesterLabel: z.string().trim().max(60).optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    geofenceRadiusM: z.coerce.number().int().min(10).max(5000).optional(),
  })
  .refine(geofenceAllOrNothing, GEOFENCE_REFINE);

export const gradeYearEnum = z.enum(["YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4", "GRADUATE", "ALUMNI"]);

export const joinClassroomSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => s.length === 6, { message: "Join code must be exactly 6 characters" }),
  // Optional — a student can join without stating it and set it later, but
  // most fill it in immediately since it's a one-tap select on the join form.
  gradeYear: gradeYearEnum.optional(),
});

export const updateGradeYearSchema = z.object({
  gradeYear: gradeYearEnum.nullable(),
});

export const bulkEnrollSchema = z.object({
  // Accepts a raw pasted blob (newline/comma/semicolon/whitespace
  // separated — however a coordinator's CSV export or copy-paste happens
  // to be delimited) as well as an already-split array, so the frontend
  // doesn't need to parse CSV itself.
  emails: z.union([
    z.array(z.string().trim().min(1)).min(1).max(1000),
    z
      .string()
      .min(1)
      .transform((raw) =>
        raw
          .split(/[\s,;]+/)
          .map((e) => e.trim())
          .filter(Boolean)
      )
      .refine((arr) => arr.length > 0 && arr.length <= 1000, { message: "Provide between 1 and 1000 email addresses" }),
  ]),
  gradeYear: gradeYearEnum.optional(),
});

export const createSessionSchema = z.object({
  label: z.string().trim().max(60).optional(),
});

export const updateSessionSchema = z.object({
  label: z.string().trim().max(60).optional(),
  qrRotationSeconds: z.coerce.number().int().min(5).max(86400).optional(),
});

export const classCheckInSchema = z.object({
  qrToken: z.string().min(10),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  accuracyMeters: z.coerce.number().min(0).max(100000).optional(),
});

export const classAttendanceOverrideSchema = z.object({
  studentId: z.string().min(1),
});
