-- ---------------------------------------------------------------------------
-- Channel support.
--
-- Adds "isDefault" to conversations. When true the channel is a platform
-- default (Announcements / General / Trades): every non-AI user is auto-joined
-- by channelBootstrap.js on boot and signup, and users cannot leave it.
--
-- Purely additive. Existing conversations keep isDefault = false.
-- ---------------------------------------------------------------------------

ALTER TABLE "conversations" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "conversations_type_isDefault_idx" ON "conversations"("type", "isDefault");