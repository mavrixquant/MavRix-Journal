-- ---------------------------------------------------------------------------
-- Add chat groups to the Conversation / ConversationParticipant tables.
--
-- Groups are just Conversations with type='group'. This migration is fully
-- ADDITIVE:
--   • Every new column on "conversations" is nullable or has a default.
--   • The new column on "conversation_participants" has a default.
--   • Two new indexes are added — no existing index is dropped.
--
-- Existing DM rows survive untouched:
--   • visibility stays NULL   → no discovery surface touches them
--   • memberCount defaults 2  → correct for a 1:1 DM
--   • role defaults 'member'  → existing participants keep their access
--   • name / description / iconEmoji stay NULL
--   • color defaults '#F59E0B' — harmless for DMs (UI ignores it)
--   • createdById stays NULL  → no owner FK for DMs
-- ---------------------------------------------------------------------------

-- 1. New group metadata columns on "conversations"
ALTER TABLE "conversations"
  ADD COLUMN "name"        TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "visibility"  TEXT,
  ADD COLUMN "color"       TEXT DEFAULT '#F59E0B',
  ADD COLUMN "iconEmoji"   TEXT,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "memberCount" INTEGER NOT NULL DEFAULT 2;

-- 2. New role column on "conversation_participants"
ALTER TABLE "conversation_participants"
  ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';

-- 3. Foreign key: Conversation.createdBy → User.id
--    onDelete: SET NULL so deleting a user leaves their groups orphaned
--    but intact, instead of cascading to wipe the group.
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Indexes
--    (type, visibility)     → powers "list public groups" discovery query
--    (conversationId, role) → powers "who is the owner of this group"
CREATE INDEX "conversations_type_visibility_idx"
  ON "conversations"("type", "visibility");

CREATE INDEX "conversation_participants_conversationId_role_idx"
  ON "conversation_participants"("conversationId", "role");