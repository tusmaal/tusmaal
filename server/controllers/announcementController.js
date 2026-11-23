const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// GET /api/announcements?course_id=
const getAnnouncements = asyncHandler(async (req, res) => {
  const { course_id } = req.query;
  let cond = course_id ? 'a.course_id = $1' : '1=1';
  const vals = course_id ? [course_id] : [];

  const result = await query(
    `SELECT a.*, u.full_name AS author_name, c.title AS course_title
     FROM announcements a
     JOIN users u ON a.author_id = u.id
     LEFT JOIN courses c ON a.course_id = c.id
     WHERE ${cond} ORDER BY a.created_at DESC`,
    vals
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/announcements
const createAnnouncement = asyncHandler(async (req, res) => {
  const { course_id, title, body, is_global } = req.body;
  if (!title || !body) throw createError('title and body are required.');

  const result = await query(
    `INSERT INTO announcements (id, course_id, author_id, title, body, is_global)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [uuidv4(), course_id || null, req.user.id, title, body, is_global || false]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// DELETE /api/announcements/:id
const deleteAnnouncement = asyncHandler(async (req, res) => {
  await query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Announcement deleted.' });
});

module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement };
