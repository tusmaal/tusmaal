const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { scaActivePlain } = require('../utils/courseAccess');

// GET /api/lessons/:lessonId/comments?page=1
const getLessonComments = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Top-level comments with reply counts
  const result = await query(
    `SELECT c.id, c.body, c.created_at, c.updated_at, c.is_pinned,
            u.id AS author_id, u.full_name AS author_name,
            u.role AS author_role, u.profile_photo AS author_photo,
            COUNT(r.id) AS reply_count
     FROM comments c
     JOIN users u ON c.author_id = u.id
     LEFT JOIN comments r ON r.parent_id = c.id
     WHERE c.lesson_id = $1 AND c.parent_id IS NULL
     GROUP BY c.id, u.id
     ORDER BY c.is_pinned DESC, c.created_at ASC
     LIMIT $2 OFFSET $3`,
    [lessonId, limit, offset]
  );

  const total = await query(
    'SELECT COUNT(*) FROM comments WHERE lesson_id = $1 AND parent_id IS NULL',
    [lessonId]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: { total: parseInt(total.rows[0].count), page: parseInt(page) }
  });
});

// GET /api/comments/:commentId/replies
const getReplies = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.id, c.body, c.created_at,
            u.id AS author_id, u.full_name AS author_name,
            u.role AS author_role, u.profile_photo AS author_photo
     FROM comments c
     JOIN users u ON c.author_id = u.id
     WHERE c.parent_id = $1
     ORDER BY c.created_at ASC`,
    [req.params.commentId]
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/lessons/:lessonId/comments
const createComment = asyncHandler(async (req, res) => {
  const { body, parent_id } = req.body;
  const { lessonId } = req.params;

  if (!body || !body.trim()) throw createError('Comment body is required.');

  // Verify student has access to this lesson's course
  const lesson = await query('SELECT course_id FROM lessons WHERE id = $1', [lessonId]);
  if (!lesson.rows.length) throw createError('Lesson not found.', 404);
  const courseId = lesson.rows[0].course_id;

  if (req.user.role === 'student') {
    const access = await query(
      `SELECT id FROM student_course_access WHERE student_id = $1 AND course_id = $2 AND ${scaActivePlain()}`,
      [req.user.id, courseId]
    );
    if (!access.rows.length) throw createError('Access denied.', 403);
  }

  const result = await query(
    `INSERT INTO comments (id, lesson_id, course_id, author_id, body, parent_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [uuidv4(), lessonId, courseId, req.user.id, body.trim(), parent_id || null]
  );

  // SLA: when a teacher/admin replies to a student's top-level question,
  // mark that question answered so we can measure response time.
  if (parent_id && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    await query(
      `UPDATE comments SET answered_at = NOW(), answered_by = $2
       WHERE id = $1 AND parent_id IS NULL AND answered_at IS NULL`,
      [parent_id, req.user.id]
    );
  }

  // Fetch with author info
  const full = await query(
    `SELECT c.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
     FROM comments c JOIN users u ON c.author_id = u.id WHERE c.id = $1`,
    [result.rows[0].id]
  );

  res.status(201).json({ success: true, data: full.rows[0] });
});

// PUT /api/comments/:commentId  (author or admin/teacher can edit)
const updateComment = asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) throw createError('Comment body is required.');

  const existing = await query('SELECT author_id FROM comments WHERE id = $1', [req.params.commentId]);
  if (!existing.rows.length) throw createError('Comment not found.', 404);

  if (req.user.role === 'student' && existing.rows[0].author_id !== req.user.id) {
    throw createError('You can only edit your own comments.', 403);
  }

  const result = await query(
    `UPDATE comments SET body = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [body.trim(), req.params.commentId]
  );

  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/comments/:commentId
const deleteComment = asyncHandler(async (req, res) => {
  const existing = await query('SELECT author_id FROM comments WHERE id = $1', [req.params.commentId]);
  if (!existing.rows.length) throw createError('Comment not found.', 404);

  if (req.user.role === 'student' && existing.rows[0].author_id !== req.user.id) {
    throw createError('You can only delete your own comments.', 403);
  }

  await query('DELETE FROM comments WHERE id = $1', [req.params.commentId]);
  res.json({ success: true, message: 'Comment deleted.' });
});

// PUT /api/comments/:commentId/pin  (teacher/admin only)
const pinComment = asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE comments SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING id, is_pinned`,
    [req.params.commentId]
  );
  if (!result.rows.length) throw createError('Comment not found.', 404);

  const pinned = result.rows[0].is_pinned;
  res.json({ success: true, message: pinned ? 'Comment pinned.' : 'Comment unpinned.', data: result.rows[0] });
});

module.exports = { getLessonComments, getReplies, createComment, updateComment, deleteComment, pinComment };
