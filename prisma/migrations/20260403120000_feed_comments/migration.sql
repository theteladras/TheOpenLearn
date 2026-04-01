-- CreateEnum
CREATE TYPE "FeedActivityTarget" AS ENUM ('TASK_COMPLETION', 'BADGE_EARNED');

-- CreateTable
CREATE TABLE "FeedComment" (
    "id" TEXT NOT NULL,
    "targetKind" "FeedActivityTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "lessonRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedComment_targetKind_targetId_createdAt_idx" ON "FeedComment"("targetKind", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedComment_authorId_idx" ON "FeedComment"("authorId");

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
