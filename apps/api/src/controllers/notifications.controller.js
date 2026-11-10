import * as svc from '../services/notifications.service.js';

export async function list(req, res, next) {
  try {
    const notifications = await svc.listNotifications(req.userId, {
      section: req.query.section,
      unreadOnly: req.query.unreadOnly === 'true',
      limit: req.query.limit,
    });
    res.json({ notifications });
  } catch (e) { next(e); }
}

export async function unreadCount(req, res, next) {
  try {
    const count = await svc.getUnreadCount(req.userId, { section: req.query.section });
    res.json({ count });
  } catch (e) { next(e); }
}

export async function markRead(req, res, next) {
  try {
    const notification = await svc.markNotificationRead(req.userId, req.params.id);
    res.json({ notification });
  } catch (e) { next(e); }
}

export async function markAllRead(req, res, next) {
  try {
    const result = await svc.markAllRead(req.userId, { section: req.body?.section });
    res.json(result);
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const result = await svc.deleteNotification(req.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

export async function clearRead(req, res, next) {
  try {
    const result = await svc.clearRead(req.userId);
    res.json(result);
  } catch (e) { next(e); }
}
export async function markFriendRequestsRead(req, res, next) {
  try {
    const cleared = await svc.markFriendRequestNotificationsRead(req.userId);
    res.json({ ok: true, cleared });
  } catch (e) { next(e); }
}
