import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireClassroomTeacher } from "../middleware/auth.js";
import { attendanceRateLimit } from "../middleware/rateLimit.js";
import {
  createClassroomSchema,
  updateClassroomSchema,
  joinClassroomSchema,
  classCheckInSchema,
} from "../validators/classroom.js";
import * as classroomService from "../services/classroom.service.js";
import { z } from "zod";

export const classroomRouter = Router();

classroomRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createClassroomSchema.parse(req.body);
    const classroom = await classroomService.createClassroom(req.user!.id, input);
    res.status(201).json(classroom);
  })
);

// "/mine", "/enrolled" and "/join" must be registered before "/:classroomId"
// — otherwise Express would match them as a :classroomId param and these
// routes would never be reached (same reasoning as event.routes.ts's "/mine").
classroomRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await classroomService.listMyClassrooms(req.user!.id));
  })
);

classroomRouter.get(
  "/enrolled",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await classroomService.listEnrolledClassrooms(req.user!.id));
  })
);

classroomRouter.post(
  "/join",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { code } = joinClassroomSchema.parse(req.body);
    const result = await classroomService.joinClassroom(code, req.user!.id);
    res.status(201).json(result);
  })
);

classroomRouter.get(
  "/:classroomId",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await classroomService.getClassroomDetail(req.params.classroomId, req.user!.id));
  })
);

classroomRouter.patch(
  "/:classroomId",
  requireAuth,
  requireClassroomTeacher(),
  asyncHandler(async (req, res) => {
    const input = updateClassroomSchema.parse(req.body);
    res.json(await classroomService.updateClassroom(req.params.classroomId, input));
  })
);

classroomRouter.delete(
  "/:classroomId",
  requireAuth,
  requireClassroomTeacher(),
  asyncHandler(async (req, res) => {
    await classroomService.deleteClassroom(req.params.classroomId);
    res.status(204).end();
  })
);

classroomRouter.get(
  "/:classroomId/roster",
  requireAuth,
  requireClassroomTeacher(),
  asyncHandler(async (req, res) => {
    res.json(await classroomService.getRoster(req.params.classroomId));
  })
);

classroomRouter.get(
  "/:classroomId/heatmap",
  requireAuth,
  asyncHandler(async (req, res) => {
    const classroomId = req.params.classroomId;
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;

    const classroom = await classroomService.getClassroomDetail(classroomId, req.user!.id);
    const isTeacher = classroom.isTeacher;

    res.json(await classroomService.getHeatmap(classroomId, req.user!.id, isTeacher, studentId));
  })
);

classroomRouter.post(
  "/:classroomId/sessions/today",
  requireAuth,
  requireClassroomTeacher(),
  asyncHandler(async (req, res) => {
    const session = await classroomService.openTodaySession(req.params.classroomId);
    res.status(201).json(session);
  })
);

classroomRouter.post(
  "/:classroomId/sessions/current/close",
  requireAuth,
  requireClassroomTeacher(),
  asyncHandler(async (req, res) => {
    res.json(await classroomService.closeTodaySession(req.params.classroomId));
  })
);

classroomRouter.get(
  "/:classroomId/sessions/current/qr",
  requireAuth,
  requireClassroomTeacher(),
  asyncHandler(async (req, res) => {
    res.json(await classroomService.issueSessionQr(req.params.classroomId));
  })
);

const rotationSchema = z.object({ qrRotationSeconds: z.coerce.number().int().min(5).max(86400) });

classroomRouter.patch(
  "/:classroomId/sessions/current",
  requireAuth,
  requireClassroomTeacher(),
  asyncHandler(async (req, res) => {
    const { qrRotationSeconds } = rotationSchema.parse(req.body);
    res.json(await classroomService.changeSessionRotation(req.params.classroomId, qrRotationSeconds));
  })
);

classroomRouter.post(
  "/:classroomId/checkin",
  requireAuth,
  attendanceRateLimit,
  asyncHandler(async (req, res) => {
    const input = classCheckInSchema.parse(req.body);
    const result = await classroomService.checkInToClassroom(req.params.classroomId, req.user!.id, input);
    res.status(201).json({
      status: "confirmed",
      distanceMeters: result.distanceMeters != null ? Math.round(result.distanceMeters) : null,
      confidence: result.confidence,
      checkedInAt: result.attendance.checkedInAt,
    });
  })
);
