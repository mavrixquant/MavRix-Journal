-- ---------------------------------------------------------------------------
-- Multi-provider BYOK credentials.
--
-- Before:
--   ai_credentials had UNIQUE(userId) — one credential per user. Saving a
--   second provider silently overwrote the first via `upsert({ where: userId })`.
--
-- After:
--   ai_credentials has UNIQUE(userId, provider). A user can store one row per
--   provider. Each row also carries:
--
--     models[]    — ordered list of chat models to round-robin within that
--                   provider. Populated at save time by discoverModels().
--                   Legacy rows get [model] backfilled.
--     lastUsedAt  — drives LRU rotation in the router. NULL means "never
--                   used", and those go first (see ORDER BY clause in
--                   router.js — we use nulls:'first').
--
-- All operations are additive or relax an existing constraint. No data loss.
-- ---------------------------------------------------------------------------

-- 1. Drop the single-provider unique index
DROP INDEX IF EXISTS "ai_credentials_userId_key";

-- 2. New columns (additive, defaults applied to existing rows)
ALTER TABLE "ai_credentials"
  ADD COLUMN "models"     JSONB        NOT NULL DEFAULT '[]',
  ADD COLUMN "lastUsedAt" TIMESTAMP(3);

-- 3. Composite unique index — one row per (userId, provider)
CREATE UNIQUE INDEX "ai_credentials_userId_provider_key"
  ON "ai_credentials"("userId", "provider");

-- 4. Non-unique lookup index — the router lists ALL credentials for a user
CREATE INDEX "ai_credentials_userId_idx"
  ON "ai_credentials"("userId");

-- 5. Backfill models from the legacy single `model` column.
--    Rows with model = NULL stay []; the router falls back to
--    getProviderMeta(provider).defaultModel at read time.
UPDATE "ai_credentials"
  SET "models" = jsonb_build_array("model")
  WHERE "model" IS NOT NULL
    AND "models" = '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual — Prisma migrations are forward-only):
--
--   DROP INDEX IF EXISTS "ai_credentials_userId_provider_key";
--   DROP INDEX IF EXISTS "ai_credentials_userId_idx";
--   ALTER TABLE "ai_credentials"
--     DROP COLUMN "lastUsedAt",
--     DROP COLUMN "models";
--   CREATE UNIQUE INDEX "ai_credentials_userId_key"
--     ON "ai_credentials"("userId");
-- ---------------------------------------------------------------------------