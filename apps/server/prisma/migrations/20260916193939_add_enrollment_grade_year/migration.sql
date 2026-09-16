-- CreateEnum
CREATE TYPE "GradeYear" AS ENUM ('YEAR_1', 'YEAR_2', 'YEAR_3', 'YEAR_4', 'GRADUATE', 'ALUMNI');

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "gradeYear" "GradeYear";
