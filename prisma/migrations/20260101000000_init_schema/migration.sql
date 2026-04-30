-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('LINK', 'PDF', 'TEXT');

-- CreateEnum
CREATE TYPE "RoadmapStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskProgressState" AS ENUM ('LOCKED', 'AVAILABLE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "FeedActivityTarget" AS ENUM ('TASK_COMPLETION', 'BADGE_EARNED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "profilePublic" BOOLEAN NOT NULL DEFAULT false,
    "publicBio" VARCHAR(280),
    "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
    "coins" INTEGER NOT NULL DEFAULT 50,
    "referralCode" TEXT,
    "referredByUserId" TEXT,
    "lastMonthlyCoinPeriod" INTEGER,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicTitle" TEXT NOT NULL,
    "topicNormalized" TEXT NOT NULL,
    "topicClusterKey" TEXT NOT NULL DEFAULT 'general',
    "userGoal" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "sourceContent" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "targetLanguage" TEXT NOT NULL DEFAULT 'en',
    "experienceLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roadmap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learningIntentId" TEXT,
    "continuedFromRoadmapId" TEXT,
    "continuationSuggestionsJson" JSONB,
    "continuationSignature" TEXT,
    "continuationPick" JSONB,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "estDurationLabel" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "RoadmapStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapPhase" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapTask" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "lessonCategory" TEXT,
    "achievementKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "title" TEXT NOT NULL,
    "explanation" TEXT,
    "whyMatters" TEXT,
    "mentorPerspective" TEXT,
    "instructions" TEXT,
    "keyTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recap" TEXT,
    "funFacts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 25,
    "estimatedMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonHandbook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "handbookJson" JSONB NOT NULL,
    "coinsSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonHandbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskResource" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "type" TEXT NOT NULL DEFAULT 'link',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskEvaluation" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "summary" TEXT,
    "checklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quizQuestions" JSONB,
    "checkpointDescription" TEXT,

    CONSTRAINT "TaskEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTaskProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" "TaskProgressState" NOT NULL DEFAULT 'LOCKED',
    "notes" TEXT,
    "feedCaption" VARCHAR(2000),
    "completedAt" TIMESTAMP(3),
    "quizSubmissionCount" INTEGER NOT NULL DEFAULT 0,
    "quizFailCount" INTEGER NOT NULL DEFAULT 0,
    "quizPassedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "xpBonus" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "FeedComment_targetKind_targetId_createdAt_idx" ON "FeedComment"("targetKind", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedComment_authorId_idx" ON "FeedComment"("authorId");

-- CreateIndex
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow"("followerId");

-- CreateIndex
CREATE INDEX "UserFollow_followingId_idx" ON "UserFollow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerId_followingId_key" ON "UserFollow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "LearningIntent_userId_topicNormalized_idx" ON "LearningIntent"("userId", "topicNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Roadmap_learningIntentId_key" ON "Roadmap"("learningIntentId");

-- CreateIndex
CREATE INDEX "Roadmap_userId_idx" ON "Roadmap"("userId");

-- CreateIndex
CREATE INDEX "Roadmap_continuedFromRoadmapId_idx" ON "Roadmap"("continuedFromRoadmapId");

-- CreateIndex
CREATE INDEX "Roadmap_continuedFromRoadmapId_continuationSignature_idx" ON "Roadmap"("continuedFromRoadmapId", "continuationSignature");

-- CreateIndex
CREATE INDEX "RoadmapPhase_roadmapId_order_idx" ON "RoadmapPhase"("roadmapId", "order");

-- CreateIndex
CREATE INDEX "RoadmapTask_phaseId_order_idx" ON "RoadmapTask"("phaseId", "order");

-- CreateIndex
CREATE INDEX "LessonHandbook_userId_idx" ON "LessonHandbook"("userId");

-- CreateIndex
CREATE INDEX "LessonHandbook_taskId_idx" ON "LessonHandbook"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonHandbook_userId_taskId_key" ON "LessonHandbook"("userId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskEvaluation_taskId_key" ON "TaskEvaluation"("taskId");

-- CreateIndex
CREATE INDEX "UserTaskProgress_userId_idx" ON "UserTaskProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTaskProgress_userId_taskId_key" ON "UserTaskProgress"("userId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_slug_key" ON "Achievement"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningIntent" ADD CONSTRAINT "LearningIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_learningIntentId_fkey" FOREIGN KEY ("learningIntentId") REFERENCES "LearningIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_continuedFromRoadmapId_fkey" FOREIGN KEY ("continuedFromRoadmapId") REFERENCES "Roadmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapPhase" ADD CONSTRAINT "RoadmapPhase_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapTask" ADD CONSTRAINT "RoadmapTask_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "RoadmapPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonHandbook" ADD CONSTRAINT "LessonHandbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonHandbook" ADD CONSTRAINT "LessonHandbook_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "RoadmapTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskResource" ADD CONSTRAINT "TaskResource_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "RoadmapTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEvaluation" ADD CONSTRAINT "TaskEvaluation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "RoadmapTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTaskProgress" ADD CONSTRAINT "UserTaskProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTaskProgress" ADD CONSTRAINT "UserTaskProgress_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "RoadmapTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
