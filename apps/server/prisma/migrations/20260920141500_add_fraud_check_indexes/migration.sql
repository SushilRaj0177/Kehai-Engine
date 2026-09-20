-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_checkedInAt_idx" ON "AttendanceRecord"("userId", "checkedInAt");

-- CreateIndex
CREATE INDEX "ClassAttendance_studentId_checkedInAt_idx" ON "ClassAttendance"("studentId", "checkedInAt");
