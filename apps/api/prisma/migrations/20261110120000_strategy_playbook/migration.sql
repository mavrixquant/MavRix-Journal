-- Additive only: existing strategies keep working with safe defaults.
ALTER TABLE "strategies"
  ADD COLUMN "playbook"        JSONB     NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "sessions"        TEXT[]    NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "symbols"         TEXT[]    NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "targetRR"        DOUBLE PRECISION,
  ADD COLUMN "riskPerTrade"    DOUBLE PRECISION,
  ADD COLUMN "maxTradesPerDay" INTEGER,
  ADD COLUMN "pinned"          BOOLEAN   NOT NULL DEFAULT false;

CREATE INDEX "strategies_userId_pinned_idx" ON "strategies"("userId", "pinned");
