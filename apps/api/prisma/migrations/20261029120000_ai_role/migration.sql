-- ---------------------------------------------------------------------------
-- Mave AI role sentinel.
--
-- The three Mave AI persona users (Guide / Trainer / Chat) are the ONLY rows
-- that may carry role = 'ai'. Before this migration, they were created with
-- role = 'user', which made them indistinguishable from normal users in the
-- admin panel.
--
-- This migration:
--   1. Sets role = 'ai' on every row where isAi = true.
--   2. Is idempotent (safe to re-run).
--   3. Adds a partial index to speed up the "find the AI users" lookup
--      that maveAiBootstrap uses on every boot.
--
-- No existing human user is promoted to 'ai' by this migration — only rows
-- that already have isAi = true are touched. Admins cannot create new 'ai'
-- users (enforced at the service layer); this is a fixed set of 3 rows.
-- ---------------------------------------------------------------------------

UPDATE "users"
   SET "role" = 'ai'
 WHERE "isAi" = true
   AND "role" <> 'ai';

-- Fast lookup for the "give me all AI users" query used during bootstrap.
CREATE INDEX IF NOT EXISTS "users_isAi_role_idx"
  ON "users" ("isAi", "role")
  WHERE "isAi" = true;