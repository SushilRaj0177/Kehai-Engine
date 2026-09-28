-- AlterTable
ALTER TABLE "Event" ADD COLUMN "locationSource" TEXT,
ADD COLUMN "locationAccuracyM" INTEGER;

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN "locationSource" TEXT,
ADD COLUMN "locationAccuracyM" INTEGER;
