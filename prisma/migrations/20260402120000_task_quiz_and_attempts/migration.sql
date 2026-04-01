-- AlterTable
ALTER TABLE "TaskEvaluation" ADD COLUMN "quizQuestions" JSONB;

-- AlterTable
ALTER TABLE "UserTaskProgress" ADD COLUMN "quizSubmissionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserTaskProgress" ADD COLUMN "quizFailCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserTaskProgress" ADD COLUMN "quizPassedAt" TIMESTAMP(3);
