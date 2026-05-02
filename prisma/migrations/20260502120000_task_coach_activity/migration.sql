-- AlterEnum
ALTER TYPE "FeedActivityTarget" ADD VALUE 'TASK_COACH';

-- CreateTable
CREATE TABLE "TaskCoachActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "userMessageExcerpt" VARCHAR(500) NOT NULL,
    "assistantExcerpt" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCoachActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCoachActivity_userId_createdAt_idx" ON "TaskCoachActivity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskCoachActivity_createdAt_idx" ON "TaskCoachActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "TaskCoachActivity" ADD CONSTRAINT "TaskCoachActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCoachActivity" ADD CONSTRAINT "TaskCoachActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "RoadmapTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
