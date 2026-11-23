const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { scaActive } = require('../utils/courseAccess');
const { notifyCourseStudents } = require('./notificationController');

// GET /api/courses/:courseId/live-sessions  (teacher/admin manage view)
const listForCourse = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ls.*, ch.name AS cohort_name
     FROM live_sessions ls
     LEFT JOIN cohorts ch ON ls.cohort_id = ch.id
     WHERE ls.course_id = $1
     ORDER BY ls.scheduled_at DESC`,
    [req.params.courseId]
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/courses/:courseId/live-sessions
const createSession = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, provider = 'meet', meeting_url, scheduled_at, duration_minutes = 60, cohort_id } = req.body;
  if (!title || !meeting_url || !scheduled_at) throw createError('Title, meeting link and time are required.');

  const result = await query(
    `INSERT INTO live_sessions
       (id, course_id, cohort_id, title, description, provider, meeting_url, scheduled_at, duration_minutes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [uuidv4(), courseId, cohort_id || null, title, description || null, provider, meeting_url, scheduled_at, duration_minutes, req.user.id]
  );

  // Notify enrolled students.
  const when = new Date(scheduled_at).toLocaleString();
  notifyCourseStudents(courseId, 'live_session',
    `Live class scheduled: ${title}`,
    `Join on ${when}.`,
    `/student/live`
  ).catch(() => {});

  res.status(201).json({ success: true, data: result.rows[0] });
});

// PUT /api/live-sessions/:id
const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, provider, meeting_url, scheduled_at, duration_minutes, cohort_id } = req.body;
  const result = await query(
    `UPDATE live_sessions SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       provider = COALESCE($4, provider),
       meeting_url = COALESCE($5, meeting_url),
       scheduled_at = COALESCE($6, scheduled_at),
       duration_minutes = COALESCE($7, duration_minutes),
       cohort_id = COALESCE($8, cohort_id)
     WHERE id = $1 RETURNING *`,
    [id, title, description, provider, meeting_url, scheduled_at, duration_minutes, cohort_id]
  );
  if (!result.rows.length) throw createError('Session not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/live-sessions/:id
const deleteSession = asyncHandler(async (req, res) => {
  await query('DELETE FROM live_sessions WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Live session deleted.' });
});

// GET /api/student/live-sessions  — upcoming sessions for courses the student can access
const myUpcoming = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ls.*, c.title AS course_title
     FROM live_sessions ls
     JOIN courses c ON ls.course_id = c.id
     JOIN student_course_access sca ON sca.course_id = ls.course_id
     WHERE sca.student_id = $1 AND ${scaActive('sca')}
       AND ls.scheduled_at > NOW() - INTERVAL '2 hours'
     ORDER BY ls.scheduled_at ASC`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { listForCourse, createSession, updateSession, deleteSession, myUpcoming };
