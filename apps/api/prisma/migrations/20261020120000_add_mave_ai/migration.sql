-- ---------------------------------------------------------------------------
-- Mave AI — data model additions.
--
-- 1. users.isAi             — sentinel flag; exactly one row (the Mave AI
--                             user) has isAi = true. All other rows keep the
--                             default false.
-- 2. messages.kind          — 'user' | 'system' | 'ai_switch'. Defaults to
--                             'user' so every existing message stays 'user'.
-- 3. ai_credentials         — per-user encrypted BYOK credentials. One row
--                             per user (UNIQUE userId).
--
-- All changes are additive. Existing rows are untouched except for the
-- boolean/integer/text defaults, which the DB will backfill automatically.
-- ---------------------------------------------------------------------------

-- 1. users.isAi
ALTER TABLE "users" ADD COLUMN "isAi" BOOLEAN NOT NULL DEFAULT false;

-- 2. messages.kind
ALTER TABLE "messages" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'user';

-- 3. ai_credentials
CREATE TABLE "ai_credentials" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "provider"     TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyIv"        TEXT NOT NULL,
    "keyTag"       TEXT NOT NULL,
    "model"        TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_credentials_userId_key" ON "ai_credentials"("userId");

-- AddForeignKey
ALTER TABLE "ai_credentials"
  ADD CONSTRAINT "ai_credentials_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;