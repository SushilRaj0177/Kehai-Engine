-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "classroomId" TEXT,
ADD COLUMN     "prevHash" TEXT,
ADD COLUMN     "hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_hash_key" ON "AuditLog"("hash");

-- CreateIndex
CREATE INDEX "AuditLog_classroomId_createdAt_idx" ON "AuditLog"("classroomId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
