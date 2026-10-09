-- ---------------------------------------------------------------------------
-- Chat (DMs)
--
-- Three tables:
--   conversations               — a chat thread. `type='dm'` today; future
--                                 Discussions will reuse this with type='channel'.
--   conversation_participants   — per-user row on a conversation. Holds the
--                                 ONLY access-control check: a user may only
--                                 interact with a conversation if their row
--                                 exists here.
--   messages                    — the message itself. Soft-delete only.
--
-- Design notes:
--   - `conversations.dmKey` is a unique sorted "userIdA:userIdB" string used
--     to guarantee one DM per pair. Null for future channels.
--   - `deletedForIds` is a Postgres TEXT[] — per-user "delete for me".
--     The read path filters with NOT (userId = ANY(deletedForIds)).
--   - `deletedAt` is the "delete for everyone" soft-delete. Body is retained
--     in the DB for potential future auditing; the serializer nulls it out.
--   - No admin model references either table. Chat is fully private.
-- ---------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'dm',
    "dmKey" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageText" TEXT,
    "lastMessageById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadMsgId" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedForIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_dmKey_key" ON "conversations"("dmKey");
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key"
  ON "conversation_participants"("conversationId", "userId");
CREATE INDEX "conversation_participants_userId_isArchived_idx"
  ON "conversation_participants"("userId", "isArchived");
CREATE INDEX "conversation_participants_userId_lastReadAt_idx"
  ON "conversation_participants"("userId", "lastReadAt");

CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- AddForeignKey
ALTER TABLE "conversation_participants"
  ADD CONSTRAINT "conversation_participants_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_participants"
  ADD CONSTRAINT "conversation_participants_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "messages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;