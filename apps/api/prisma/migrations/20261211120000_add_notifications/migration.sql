-- ---------------------------------------------------------------------------
-- Per-user persistent notifications.
--
-- Backed by SSE (event: notification:new) so the client can invalidate its
-- query cache. Stored per-user so unread counts / badges survive reloads and
-- sync across devices.
--
-- section ? common | broadcasts
-- type    ? chat | friend_request | friend_accept | gex_update | broadcast | changelog | system
-- ---------------------------------------------------------------------------

CREATE TABLE "notifications" (
    "id"        TEXT          NOT NULL,
    "userId"    TEXT          NOT NULL,
    "type"      TEXT          NOT NULL,
    "section"   TEXT          NOT NULL DEFAULT 'common',
    "title"     TEXT          NOT NULL,
    "body"      TEXT          NOT NULL DEFAULT '',
    "data"      JSONB         NOT NULL DEFAULT '{}',
    "readAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_userId_createdAt_idx"
  ON "notifications"("userId", "createdAt");

CREATE INDEX "notifications_userId_readAt_idx"
  ON "notifications"("userId", "readAt");

CREATE INDEX "notifications_userId_section_idx"
  ON "notifications"("userId", "section");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;