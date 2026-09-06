-- DropIndex
DROP INDEX "ClassSession_classroomId_date_key";

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "label" TEXT;

-- CreateIndex
CREATE INDEX "ClassSession_classroomId_status_idx" ON "ClassSession"("classroomId", "status");
