-- ---------------------------------------------------------------------------
-- Username cooldown (3-day rule).
--
-- Tracks when the user last changed their username from Settings.
-- setUsername (initial /set-username page) does NOT stamp this — the first
-- change from Settings is free. Every subsequent change is throttled to
-- once every 3 days by the API layer.
--
-- Nullable: existing users have NULL (never changed via Settings).
-- ---------------------------------------------------------------------------

ALTER TABLE "users" ADD COLUMN "usernameChangedAt" TIMESTAMP(3);