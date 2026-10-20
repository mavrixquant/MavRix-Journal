
import * as svc from '../services/friends.service.js';


export async function listFriends(req, res, next) {
  try {
    const friends = await svc.listFriends(req.userId);
    res.json({ friends });
  } catch (e) { next(e); }
}

export async function removeFriend(req, res, next) {
  try {
    const result = await svc.removeFriend(req.userId, req.params.friendId);
    res.json(result);
  } catch (e) { next(e); }
}


export async function listRequests(req, res, next) {
  try {
    const [incoming, outgoing] = await Promise.all([
      svc.listIncomingRequests(req.userId),
      svc.listOutgoingRequests(req.userId),
    ]);
    res.json({ incoming, outgoing });
  } catch (e) { next(e); }
}

export async function sendRequest(req, res, next) {
  try {
    const request = await svc.sendFriendRequest(req.userId, req.body);
    res.status(201).json({ request });
  } catch (e) { next(e); }
}

export async function acceptRequest(req, res, next) {
  try {
    const request = await svc.acceptFriendRequest(req.userId, req.params.id);
    res.json({ request });
  } catch (e) { next(e); }
}

export async function declineRequest(req, res, next) {
  try {
    const result = await svc.declineFriendRequest(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

export async function cancelRequest(req, res, next) {
  try {
    const result = await svc.cancelFriendRequest(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}


export async function listBlocks(req, res, next) {
  try {
    const blocks = await svc.listBlocks(req.userId);
    res.json({ blocks });
  } catch (e) { next(e); }
}

export async function blockUser(req, res, next) {
  try {
    const result = await svc.blockUser(req.userId, req.body.userId, req.body.reason);
    res.json(result);
  } catch (e) { next(e); }
}

export async function unblockUser(req, res, next) {
  try {
    const result = await svc.unblockUser(req.userId, req.params.userId);
    res.json(result);
  } catch (e) { next(e); }
}


export async function getStatus(req, res, next) {
  try {
    const status = await svc.getFriendStatus(req.userId, req.params.userId);
    res.json({ status });
  } catch (e) { next(e); }
}