import * as svc from '../services/chat.service.js';
import { stopAiForConversation } from '../services/ai.service.js';

export async function searchUsers(req, res, next) {
  try {
    const users = await svc.searchUsers(req.userId, req.query.q);
    res.json({ users });
  } catch (e) { next(e); }
}

export async function listConversations(req, res, next) {
  try {
    const conversations = await svc.listConversations(req.userId);
    res.json({ conversations });
  } catch (e) { next(e); }
}

export async function createConversation(req, res, next) {
  try {
    const conversation = await svc.getOrCreateDm(req.userId, req.body.peerId);
    res.status(201).json({ conversation });
  } catch (e) { next(e); }
}

export async function getConversation(req, res, next) {
  try {
    const conversation = await svc.getConversation(req.userId, req.params.id);
    res.json({ conversation });
  } catch (e) { next(e); }
}

export async function updateConversation(req, res, next) {
  try {
    const result = await svc.updateConversation(req.userId, req.params.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
}

export async function clearChat(req, res, next) {
  try {
    const result = await svc.clearChat(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

// ---------------------------------------------------------------------------
// Reset AI memory — dedicated action for AI conversations only.
// Delegates to svc.resetAiMemory, which also aborts any in-flight AI
// generation before wiping the message table.
// ---------------------------------------------------------------------------
export async function resetAiMemory(req, res, next) {
  try {
    const result = await svc.resetAiMemory(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

export async function listMessages(req, res, next) {
  try {
    const result = await svc.listMessages(req.userId, req.params.id, {
      before: req.query.before,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (e) { next(e); }
}

export async function sendMessage(req, res, next) {
  try {
    const message = await svc.sendMessage(req.userId, req.params.id, req.body);
    res.status(201).json({ message });
  } catch (e) { next(e); }
}

export async function markRead(req, res, next) {
  try {
    const result = await svc.markRead(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

export async function markDelivered(req, res, next) {
  try {
    const result = await svc.markDelivered(req.userId, req.params.messageId);
    res.json(result);
  } catch (e) { next(e); }
}

export async function typing(req, res, next) {
  try {
    const result = await svc.broadcastTyping(req.userId, req.params.id, req.body.isTyping);
    res.json(result);
  } catch (e) { next(e); }
}

export async function editMessage(req, res, next) {
  try {
    const message = await svc.editMessage(req.userId, req.params.messageId, req.body);
    res.json({ message });
  } catch (e) { next(e); }
}

export async function deleteMessage(req, res, next) {
  try {
    const scope = req.query.scope === 'all' ? 'all' : 'me';
    const result = await svc.deleteMessage(req.userId, req.params.messageId, scope);
    res.json(result);
  } catch (e) { next(e); }
}

export async function discoverGroups(req, res, next) {
  try {
    const groups = await svc.listDiscoverablePublicGroups(req.userId, {
      q: req.query.q,
      limit: req.query.limit,
    });
    res.json({ groups });
  } catch (e) { next(e); }
}

export async function joinGroup(req, res, next) {
  try {
    const conversation = await svc.joinPublicGroup(req.userId, req.params.id);
    res.json({ conversation });
  } catch (e) { next(e); }
}

export async function leaveGroup(req, res, next) {
  try {
    const result = await svc.leaveGroup(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

export async function listGroupMembers(req, res, next) {
  try {
    const members = await svc.listGroupMembers(req.userId, req.params.id);
    res.json({ members });
  } catch (e) { next(e); }
}

export async function stopAi(req, res, next) {
  try {
    const result = stopAiForConversation(req.params.id, req.userId);
    res.json(result);
  } catch (e) { next(e); }
}