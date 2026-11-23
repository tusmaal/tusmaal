const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { scaActivePlain } = require('../utils/courseAccess');

// ─── INTERNAL HELPER ──────────────────────────────────────────────────────
// Called internally by other controllers to create notifications
const createNotification = async (userId, type, title, message, link = null) => {
  try {
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), userId, type, title, message, link]
    );
  } catch (err) {
    console.error('Notification create error:', err.message);
  }
};

// Bulk notify — e.g. notify all students in a course
const notifyCourseStudents = async (courseId, type, title, message, link = null) => {
  try {
    const students = await query(
      `SELECT student_id FROM student_course_access WHERE course_id = $1 AND ${scaActivePlain()}`,
      [courseId]
    );
    for (const row of students.rows) {
      await createNotification(row.student_id, type, title, message, link);
    }
  } catch (err) {
    console.error('Bulk notification error:', err.message);
  }
};

// ─── API HANDLERS ─────────────────────────────────────────────────────────

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unread_only } = req.query;
  const offset = (page - 1) * limit;

  let where = 'user_id = $1';
  if (unread_only === 'true') where += ' AND is_read = FALSE';

  const result = await query(
    `SELECT id, type, title, message, link, is_read, created_at
     FROM notifications WHERE ${where}
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset]
  );

  const unreadCount = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [req.user.id]
  );

  res.json({
    success: true,
    data: result.rows,
    unread_count: parseInt(unreadCount.rows[0].count)
  });
});

// PUT /api/notifications/mark-read
// Body: { ids: ['uuid1', 'uuid2'] } or { all: true }
const markAsRead = asyncHandler(async (req, res) => {
  const { ids, all } = req.body;

  if (all) {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  }

  if (!ids || !ids.length) throw createError('ids array or all:true is required.');

  await query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = ANY($1::uuid[]) AND user_id = $2`,
    [ids, req.user.id]
  );

  res.json({ success: true, message: `${ids.length} notification(s) marked as read.` });
});

// DELETE /api/notifications/clear
const clearNotifications = asyncHandler(async (req, res) => {
  await query('DELETE FROM notifications WHERE user_id = $1 AND is_read = TRUE', [req.user.id]);
  res.json({ success: true, message: 'Read notifications cleared.' });
});

module.exports = { getNotifications, markAsRead, clearNotifications, createNotification, notifyCourseStudents };
