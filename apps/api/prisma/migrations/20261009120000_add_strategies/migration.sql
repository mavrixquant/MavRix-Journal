-- ---------------------------------------------------------------------------
-- Add Strategy model + Trade.strategyId FK (onDelete: SetNull).
--
-- Design:
--   - A Strategy is owned by a user (FK → users.id, onDelete: Cascade).
--   - A Trade may reference one strategy (FK → strategies.id, onDelete: SetNull).
--     Deleting a strategy does NOT delete its trades — they just lose the tag.
--   - One name per user (unique index on userId + name).
--   - `tags` is a Postgres TEXT[] with an empty-array default.
-- ---------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "strategies" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "rules"       TEXT NOT NULL DEFAULT '',
    "status"      TEXT NOT NULL DEFAULT 'active',
    "color"       TEXT NOT NULL DEFAULT '#F59E0B',
    "direction"   TEXT,
    "timeframe"   TEXT,
    "tags"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "trades" ADD COLUMN "strategyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "strategies_userId_name_key" ON "strategies"("userId", "name");
CREATE INDEX "strategies_userId_idx" ON "strategies"("userId");
CREATE INDEX "strategies_userId_status_idx" ON "strategies"("userId", "status");
CREATE INDEX "trades_strategyId_idx" ON "trades"("strategyId");

-- AddForeignKey
ALTER TABLE "strategies"
  ADD CONSTRAINT "strategies_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trades"
  ADD CONSTRAINT "trades_strategyId_fkey"
  FOREIGN KEY ("strategyId") REFERENCES "strategies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;