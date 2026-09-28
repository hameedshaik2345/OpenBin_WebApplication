const notificationService = require("../services/notificationService");

async function list(req, res) {
  try {
    const notifications = await notificationService.listUserNotifications(
      req.dbUser.user_id,
      req.query.limit
    );
    return res.json({ notifications });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function markRead(req, res) {
  try {
    const notification = await notificationService.markAsRead(
      req.params.notificationId,
      req.dbUser.user_id
    );
    return res.json({ notification });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function markAllRead(req, res) {
  try {
    const result = await notificationService.markAllAsRead(req.dbUser.user_id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  list,
  markRead,
  markAllRead,
};
