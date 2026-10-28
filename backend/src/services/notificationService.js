const pool = require("../config/database");

async function createNotification({ userId, title, message, type = "INFO" }, client = null) {
  const db = client || pool;
  const result = await db.query(
    `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
     VALUES ($1, $2, $3, $4, false, now())
     RETURNING *`,
    [userId, title, message, type]
  );
  return result.rows[0];
}

async function listUserNotifications(userId, limit = 20) {
  const result = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

async function markAsRead(notificationId, userId) {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE notification_id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return result.rows[0];
}

async function markAllAsRead(userId) {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1`,
    [userId]
  );
  return { success: true };
}

module.exports = {
  createNotification,
  listUserNotifications,
  markAsRead,
  markAllAsRead,
};
