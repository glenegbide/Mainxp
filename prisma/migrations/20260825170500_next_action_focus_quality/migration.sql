-- Next Action engine: every important task can carry its smallest physical
-- next move. Arena learns interruption sources and focus quality.
ALTER TABLE "mainxp_tasks" ADD COLUMN "nextAction" TEXT NOT NULL DEFAULT '';
ALTER TABLE "mainxp_focus_sessions" ADD COLUMN "interruptSources" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "mainxp_focus_sessions" ADD COLUMN "quality" TEXT;
