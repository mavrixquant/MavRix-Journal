-- ---------------------------------------------------------------------------
-- Read receipts for 1:1 chat.
--
-- Adds two nullable columns to "messages":
--   deliveredAt — set when a NON-SENDER participant's device receives the
--                 message. Populated either by an explicit client ack
--                 (POST /messages/:id/delivered) or in bulk by markRead.
--   readAt      — set when a NON-SENDER participant actually opens the
--                 conversation. Populated by markRead.
--
-- Ticks rendered in the UI:
--   (no server id)            clock         — sending (optimistic)
--   id, deliveredAt = null    ✓    grey     — sent
--   deliveredAt set, readAt=null  ✓✓  grey  — delivered
--   readAt set                ✓✓  green    — read
--
-- No backfill: existing messages stay null → sender sees ✓ grey (sent).
-- The next time the peer opens the conversation, markRead bulk-populates
-- both columns on every inbound message.
-- ---------------------------------------------------------------------------

ALTER TABLE "messages" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "messages" ADD COLUMN "readAt" TIMESTAMP(3);