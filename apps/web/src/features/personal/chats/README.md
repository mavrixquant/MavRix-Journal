# Chats

Private direct messages (DMs) between users. Fully realtime. No admin can
read, moderate, or even know a conversation exists.

## Privacy guarantee

Chat is the only feature in the app with **zero admin surface**. There is
no `GET /api/admin/chat/*`, no admin service imports chat models, and the
`AdminAuditLog` never records a chat read.

The **only** access-control check is `ConversationParticipant`:

If the row is missing, the API returns `404 Not Found` (not `403`) so
conversation existence is never leaked. This check lives in exactly one
place — `assertParticipant()` in `apps/api/src/services/chat.service.js` —
and every service function calls it before touching anything else.

## Realtime contract

All chat events flow over the single SSE stream already opened by the app
at `GET /api/events`. No new endpoint, no new connection.

| Event | Payload | Recipients | Persisted |
|---|---|---|---|
| `chat:message:new` | `{ conversationId, message }` | all participants | yes |
| `chat:message:edited` | `{ conversationId, messageId, body, editedAt }` | all participants | yes |
| `chat:message:deleted` | `{ conversationId, messageId, scope: 'all' }` | all participants | yes (soft-delete) |
| `chat:typing` | `{ conversationId, userId, isTyping }` | other participants | no — 4s TTL |

The client bridge in `apps/web/src/shared/api/sse.js` handles each event:

- `chat:message:new` → appends to `['chat','messages',conversationId]` via
  `setQueryData`, invalidates `['chat','conversations']` for sidebar refresh,
  clears the sender's typing state.
- `chat:message:edited` / `chat:message:deleted` → patches the message in
  place. Same sidebar invalidation.
- `chat:typing` → pushes into `shared/chat/chatStream.js` (a tiny pub/sub
  with a 4s TTL), consumed by `useTypingIndicator()`.

### Optimistic send — race handling

Sending a message is optimistic. The client appends a temp message
(`__optimistic__<ts>_<n>`) to the cache, then POSTs. The backend broadcasts
`chat:message:new` to **all** participants including the sender — so the
SSE echo and the HTTP `onSuccess` race.

To make this idempotent, `useSendMessage.onSuccess` removes **both** the
temp id **and** any pre-existing real message with the same id, then
appends the server-confirmed message once. Correct regardless of which
lands first.

## Edit / delete semantics

**Edit window** — 15 minutes from send. Enforced server-side in
`chat.service.js`. The client hides the edit button past the window using
a `nowTs` state variable refreshed every 30s by an effect (React 19 forbids
reading `Date.now()` during render).

**Delete — two scopes:**

| Query | Effect | Broadcast |
|---|---|---|
| `DELETE /api/chat/messages/:id?scope=me` | Appends `userId` to `Message.deletedForIds`. Only the requester stops seeing it. | none |
| `DELETE /api/chat/messages/:id?scope=all` | Sets `Message.deletedAt`. Body nulled on the wire for everyone. Sender-only. | `chat:message:deleted` |

Read paths (fetch + SSE append) filter with
`NOT: { deletedForIds: { has: userId } }`.

## Schema

Three tables, defined in `apps/api/prisma/schema.prisma`:

- **Conversation** — one row per DM. `dmKey` is a sorted `"aId:bId"` string,
  unique, that guarantees one DM per pair of users.
- **ConversationParticipant** — per-user row holding `unreadCount`,
  `lastReadAt`, `lastReadMsgId`, `isPinned`, `isMuted`, `isArchived`.
- **Message** — `body`, `replyToId` (self-FK), `editedAt`, `deletedAt`,
  `deletedForIds` (Postgres `TEXT[]`).

## Future: Discussions

The schema is designed to absorb Discussions without a breaking migration:

- `Conversation.type = 'channel'` (already exists, defaults to `'dm'`).
- Add nullable `slug`, `topic`, `isPublic`, `createdById`.
- `ConversationParticipant` gains `isModerator`.
- Admin moderation routes (`/api/admin/discussions/*`) will be added then —
  Discussions are *intentionally* admin-visible, DMs are not. That's a
  policy difference enforced by which routes exist, not by schema.

Same `Message` table, same SSE event names, same client bridge. The UI will
add a "Discussion" tab in `/personal/discussion`; `ChatsPage` stays DM-only.

## File map
