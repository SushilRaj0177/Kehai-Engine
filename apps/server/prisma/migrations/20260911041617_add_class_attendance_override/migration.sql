-- AlterTable
ALTER TABLE "ClassAttendance" ADD COLUMN     "method" "AttendanceMethod" NOT NULL DEFAULT 'QR_GEO',
ADD COLUMN     "overriddenById" TEXT;
