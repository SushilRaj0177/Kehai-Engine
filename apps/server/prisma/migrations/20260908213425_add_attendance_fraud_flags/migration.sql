-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "flagReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ClassAttendance" ADD COLUMN     "flagReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false;
