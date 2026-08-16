-- CreateEnum
CREATE TYPE "MxAttribute" AS ENUM ('STRENGTH', 'ENDURANCE', 'FOCUS', 'DISCIPLINE', 'KNOWLEDGE', 'STRATEGY', 'WEALTH', 'MIND', 'SOCIAL');

-- CreateEnum
CREATE TYPE "MxGoalHorizon" AS ENUM ('LIFETIME', 'THREE_YEAR', 'ONE_YEAR', 'NINETY_DAY', 'MONTHLY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "MxGoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MxProjectStatus" AS ENUM ('IDEA', 'PLANNING', 'ACTIVE', 'WAITING', 'BLOCKED', 'AT_RISK', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MxTaskTier" AS ENUM ('MAIN_QUEST', 'DAILY_MISSION', 'SIDE_QUEST', 'BACKLOG');

-- CreateEnum
CREATE TYPE "MxTaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MxCadence" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "MxEvidence" AS ENUM ('SELF_REPORTED', 'SYSTEM_RECORDED', 'VERIFIED');

-- CreateTable
CREATE TABLE "mainxp_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Zurich',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "onboardingStage" TEXT NOT NULL DEFAULT 'new',
    "occupation" TEXT NOT NULL DEFAULT '',
    "coachTone" TEXT NOT NULL DEFAULT 'balanced',
    "notificationMode" TEXT NOT NULL DEFAULT 'normal',
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "restMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mainxp_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "evidence" "MxEvidence" NOT NULL DEFAULT 'SELF_REPORTED',
    "dayKey" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_north_stars" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "why" TEXT NOT NULL DEFAULT '',
    "values" JSONB NOT NULL DEFAULT '[]',
    "futureSelf" TEXT NOT NULL DEFAULT '',
    "vision1Year" TEXT NOT NULL DEFAULT '',
    "mission90Days" TEXT NOT NULL DEFAULT '',
    "season" TEXT NOT NULL DEFAULT '',
    "priorities" JSONB NOT NULL DEFAULT '[]',
    "personalRules" JSONB NOT NULL DEFAULT '[]',
    "importantPeople" JSONB NOT NULL DEFAULT '[]',
    "refusals" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mainxp_north_stars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "why" TEXT NOT NULL DEFAULT '',
    "lifeArea" TEXT NOT NULL DEFAULT '',
    "horizon" "MxGoalHorizon" NOT NULL DEFAULT 'NINETY_DAY',
    "targetValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "deadline" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" "MxGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "reward" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "mainxp_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "desiredOutcome" TEXT NOT NULL DEFAULT '',
    "why" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "deadline" TIMESTAMP(3),
    "status" "MxProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "nextAction" TEXT NOT NULL DEFAULT '',
    "blockers" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "mainxp_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_milestones" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "mainxp_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "tier" "MxTaskTier" NOT NULL DEFAULT 'DAILY_MISSION',
    "status" "MxTaskStatus" NOT NULL DEFAULT 'OPEN',
    "dayKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "estimateMin" INTEGER,
    "postponeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "mainxp_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_non_negotiables" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "cadence" "MxCadence" NOT NULL DEFAULT 'DAILY',
    "target" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "minimum" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_non_negotiables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_non_negotiable_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nonNegotiableId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mainxp_non_negotiable_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_habits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'good',
    "category" TEXT NOT NULL DEFAULT '',
    "attribute" "MxAttribute",
    "cadence" "MxCadence" NOT NULL DEFAULT 'DAILY',
    "target" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "minimum" DOUBLE PRECISION,
    "reminder" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_habit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_habit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_day_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "mood" INTEGER,
    "energy" INTEGER,
    "stress" INTEGER,
    "focus" INTEGER,
    "startedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewWentWell" TEXT NOT NULL DEFAULT '',
    "reviewMissedWhy" TEXT NOT NULL DEFAULT '',
    "reviewLesson" TEXT NOT NULL DEFAULT '',
    "tomorrowBigThing" TEXT NOT NULL DEFAULT '',
    "preparedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mainxp_day_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_focus_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "goalId" TEXT,
    "plannedMin" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "interruptions" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "mainxp_focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_xp_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "reason" TEXT NOT NULL,
    "evidence" "MxEvidence" NOT NULL DEFAULT 'SELF_REPORTED',
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "mainDelta" INTEGER NOT NULL,
    "coinsDelta" INTEGER NOT NULL DEFAULT 0,
    "attributeDeltas" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT,
    "reversesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_gear_owned" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gearId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_gear_owned_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "costCoins" INTEGER NOT NULL,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_journal_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'free',
    "content" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_gratitude_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "whyItMatter" TEXT NOT NULL DEFAULT '',
    "thankWho" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_gratitude_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "source" TEXT NOT NULL DEFAULT 'user_stated',
    "sensitivity" TEXT NOT NULL DEFAULT 'normal',
    "scope" TEXT NOT NULL DEFAULT 'long_term',
    "expiresAt" TIMESTAMP(3),
    "doNotUseInCoaching" BOOLEAN NOT NULL DEFAULT false,
    "embeddingRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "mainxp_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mainxp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_users_email_key" ON "mainxp_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_events_idempotencyKey_key" ON "mainxp_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "mainxp_events_userId_type_idx" ON "mainxp_events"("userId", "type");

-- CreateIndex
CREATE INDEX "mainxp_events_userId_dayKey_idx" ON "mainxp_events"("userId", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_sessions_tokenHash_key" ON "mainxp_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "mainxp_sessions_userId_idx" ON "mainxp_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_north_stars_userId_key" ON "mainxp_north_stars"("userId");

-- CreateIndex
CREATE INDEX "mainxp_goals_userId_status_idx" ON "mainxp_goals"("userId", "status");

-- CreateIndex
CREATE INDEX "mainxp_projects_userId_status_idx" ON "mainxp_projects"("userId", "status");

-- CreateIndex
CREATE INDEX "mainxp_milestones_projectId_idx" ON "mainxp_milestones"("projectId");

-- CreateIndex
CREATE INDEX "mainxp_tasks_userId_dayKey_idx" ON "mainxp_tasks"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "mainxp_tasks_userId_status_idx" ON "mainxp_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "mainxp_non_negotiables_userId_active_idx" ON "mainxp_non_negotiables"("userId", "active");

-- CreateIndex
CREATE INDEX "mainxp_non_negotiable_logs_userId_periodKey_idx" ON "mainxp_non_negotiable_logs"("userId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_non_negotiable_logs_nonNegotiableId_periodKey_key" ON "mainxp_non_negotiable_logs"("nonNegotiableId", "periodKey");

-- CreateIndex
CREATE INDEX "mainxp_habits_userId_active_idx" ON "mainxp_habits"("userId", "active");

-- CreateIndex
CREATE INDEX "mainxp_habit_logs_userId_periodKey_idx" ON "mainxp_habit_logs"("userId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_habit_logs_habitId_periodKey_key" ON "mainxp_habit_logs"("habitId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_day_plans_userId_dayKey_key" ON "mainxp_day_plans"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "mainxp_focus_sessions_userId_startedAt_idx" ON "mainxp_focus_sessions"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_xp_transactions_idempotencyKey_key" ON "mainxp_xp_transactions"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_xp_transactions_reversesId_key" ON "mainxp_xp_transactions"("reversesId");

-- CreateIndex
CREATE INDEX "mainxp_xp_transactions_userId_createdAt_idx" ON "mainxp_xp_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "mainxp_xp_transactions_userId_sourceType_idx" ON "mainxp_xp_transactions"("userId", "sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_gear_owned_userId_gearId_key" ON "mainxp_gear_owned"("userId", "gearId");

-- CreateIndex
CREATE INDEX "mainxp_rewards_userId_active_idx" ON "mainxp_rewards"("userId", "active");

-- CreateIndex
CREATE INDEX "mainxp_journal_entries_userId_dayKey_idx" ON "mainxp_journal_entries"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "mainxp_gratitude_entries_userId_dayKey_idx" ON "mainxp_gratitude_entries"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "mainxp_memories_userId_type_idx" ON "mainxp_memories"("userId", "type");

-- CreateIndex
CREATE INDEX "mainxp_conversations_userId_updatedAt_idx" ON "mainxp_conversations"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "mainxp_messages_conversationId_createdAt_idx" ON "mainxp_messages"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "mainxp_events" ADD CONSTRAINT "mainxp_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_sessions" ADD CONSTRAINT "mainxp_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_north_stars" ADD CONSTRAINT "mainxp_north_stars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_goals" ADD CONSTRAINT "mainxp_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_projects" ADD CONSTRAINT "mainxp_projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_projects" ADD CONSTRAINT "mainxp_projects_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "mainxp_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_milestones" ADD CONSTRAINT "mainxp_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "mainxp_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_tasks" ADD CONSTRAINT "mainxp_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_tasks" ADD CONSTRAINT "mainxp_tasks_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "mainxp_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_tasks" ADD CONSTRAINT "mainxp_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "mainxp_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_non_negotiables" ADD CONSTRAINT "mainxp_non_negotiables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_non_negotiables" ADD CONSTRAINT "mainxp_non_negotiables_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "mainxp_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_non_negotiable_logs" ADD CONSTRAINT "mainxp_non_negotiable_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_non_negotiable_logs" ADD CONSTRAINT "mainxp_non_negotiable_logs_nonNegotiableId_fkey" FOREIGN KEY ("nonNegotiableId") REFERENCES "mainxp_non_negotiables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_habits" ADD CONSTRAINT "mainxp_habits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_habits" ADD CONSTRAINT "mainxp_habits_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "mainxp_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_habit_logs" ADD CONSTRAINT "mainxp_habit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_habit_logs" ADD CONSTRAINT "mainxp_habit_logs_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "mainxp_habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_day_plans" ADD CONSTRAINT "mainxp_day_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_focus_sessions" ADD CONSTRAINT "mainxp_focus_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_focus_sessions" ADD CONSTRAINT "mainxp_focus_sessions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "mainxp_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_focus_sessions" ADD CONSTRAINT "mainxp_focus_sessions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "mainxp_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_xp_transactions" ADD CONSTRAINT "mainxp_xp_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_gear_owned" ADD CONSTRAINT "mainxp_gear_owned_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_rewards" ADD CONSTRAINT "mainxp_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_journal_entries" ADD CONSTRAINT "mainxp_journal_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_gratitude_entries" ADD CONSTRAINT "mainxp_gratitude_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_memories" ADD CONSTRAINT "mainxp_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_conversations" ADD CONSTRAINT "mainxp_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_messages" ADD CONSTRAINT "mainxp_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "mainxp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
