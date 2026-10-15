// apps/web/src/shared/api/friends.js
//
// React Query hooks for the friend subsystem.
//
// Cache keys:
//   ['friends','list']              — my friends
//   ['friends','requests']          — { incoming, outgoing } pending
//   ['friends','blocks']            — users I've blocked
//   ['friends','status',userId]     — status of a single peer
//
// SSE integration: shared/api/sse.js invalidates these keys when the server
// broadcasts friend:request:*, friend:removed, block:new, block:removed.
//
// Mutations are optimistic where it's safe:
//   • sendRequest       → invalidates only (no optimistic list to update)
//   • acceptRequest     → invalidates list + requests + conversations
//   • declineRequest    → optimistic remove from incoming
//   • cancelRequest     → optimistic remove from outgoing
//   • removeFriend      → optimistic remove from list
//   • blockUser         → invalidates broadly (affects many views)
//   • unblockUser       → optimistic remove from blocks

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client.js';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const friendsKeys = {
  all: ['friends'],
  list: () => ['friends', 'list'],
  requests: () => ['friends', 'requests'],
  blocks: () => ['friends', 'blocks'],
  status: (userId) => ['friends', 'status', userId],
};

/* ------------------------------------------------------------------ */
/*  Raw fetchers                                                       */
/* ------------------------------------------------------------------ */

export async function fetchFriends() {
  const data = await apiJson('/api/friends');
  return data.friends;
}

export async function fetchFriendRequests() {
  return apiJson('/api/friends/requests');
}

export async function fetchBlocks() {
  const data = await apiJson('/api/friends/blocks');
  return data.blocks;
}

export async function fetchFriendStatus(userId) {
  const data = await apiJson(`/api/friends/status/${encodeURIComponent(userId)}`);
  return data.status;
}

export async function sendFriendRequest({ toUserId, email, message }) {
  const data = await apiJson('/api/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ toUserId, email, message }),
  });
  return data.request;
}

export async function acceptFriendRequest(requestId) {
  const data = await apiJson(
    `/api/friends/requests/${encodeURIComponent(requestId)}/accept`,
    { method: 'POST' }
  );
  return data.request;
}

export async function declineFriendRequest(requestId) {
  return apiJson(
    `/api/friends/requests/${encodeURIComponent(requestId)}/decline`,
    { method: 'POST' }
  );
}

export async function cancelFriendRequest(requestId) {
  return apiJson(
    `/api/friends/requests/${encodeURIComponent(requestId)}`,
    { method: 'DELETE' }
  );
}

export async function removeFriend(friendId) {
  return apiJson(
    `/api/friends/${encodeURIComponent(friendId)}`,
    { method: 'DELETE' }
  );
}

export async function blockUser({ userId, reason }) {
  return apiJson('/api/friends/blocks', {
    method: 'POST',
    body: JSON.stringify({ userId, reason }),
  });
}

export async function unblockUser(userId) {
  return apiJson(
    `/api/friends/blocks/${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

export function useFriends({ enabled = true } = {}) {
  return useQuery({
    queryKey: friendsKeys.list(),
    queryFn: fetchFriends,
    enabled,
    staleTime: 30_000,
  });
}

export function useFriendRequests({ enabled = true } = {}) {
  return useQuery({
    queryKey: friendsKeys.requests(),
    queryFn: fetchFriendRequests,
    enabled,
    staleTime: 15_000,
  });
}

export function useBlocks({ enabled = true } = {}) {
  return useQuery({
    queryKey: friendsKeys.blocks(),
    queryFn: fetchBlocks,
    enabled,
    staleTime: 60_000,
  });
}

export function useFriendStatus(userId, { enabled = true } = {}) {
  return useQuery({
    queryKey: friendsKeys.status(userId),
    queryFn: () => fetchFriendStatus(userId),
    enabled: enabled && !!userId,
    staleTime: 20_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

function useInvalidateFriends() {
  const qc = useQueryClient();
  return (...keys) => {
    for (const key of keys) {
      qc.invalidateQueries({ queryKey: key });
    }
  };
}

export function useSendFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      invalidate(friendsKeys.requests());
      // Peer cards across the app may now show "Pending".
      invalidate(['friends']);
    },
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.all });
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: declineFriendRequest,
    onMutate: async (requestId) => {
      const key = friendsKeys.requests();
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          incoming: (old.incoming || []).filter((r) => r.id !== requestId),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(friendsKeys.requests(), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.requests() });
    },
  });
}

export function useCancelFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelFriendRequest,
    onMutate: async (requestId) => {
      const key = friendsKeys.requests();
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          outgoing: (old.outgoing || []).filter((r) => r.id !== requestId),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(friendsKeys.requests(), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.requests() });
    },
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeFriend,
    onMutate: async (friendId) => {
      const key = friendsKeys.list();
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((f) => f.id !== friendId);
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(friendsKeys.list(), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.all });
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: blockUser,
    onSuccess: () => {
      // Blocking affects many views — invalidate the whole friends + chat
      // subtree in one shot. Rare operation, so a broad refetch is fine.
      qc.invalidateQueries({ queryKey: friendsKeys.all });
      qc.invalidateQueries({ queryKey: ['chat'] });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unblockUser,
    onMutate: async (userId) => {
      const key = friendsKeys.blocks();
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((b) => b.user?.id !== userId);
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(friendsKeys.blocks(), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.all });
      qc.invalidateQueries({ queryKey: ['chat'] });
    },
  });
}