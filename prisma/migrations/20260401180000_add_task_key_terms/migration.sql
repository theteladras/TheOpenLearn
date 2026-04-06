-- AlterTable
ALTER TABLE "RoadmapTask" ADD COLUMN "keyTerms" TEXT[] DEFAULT ARRAY[]::TEXT[];
