const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// ─── COURSE FAQs ───────────────────────────────────────────────────────────

// GET /api/courses/:courseId/faqs  (public)
const listFaqs = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, question, answer, order_index FROM course_faqs
     WHERE course_id = $1 ORDER BY order_index, created_at`,
    [req.params.courseId]
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/courses/:courseId/faqs
const createFaq = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { question, answer, order_index = 0 } = req.body;
  if (!question || !answer) throw createError('Question and answer are required.');
  const result = await query(
    `INSERT INTO course_faqs (id, course_id, question, answer, order_index, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [uuidv4(), courseId, question, answer, order_index, req.user.id]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// PUT /api/faqs/:id
const updateFaq = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { question, answer, order_index } = req.body;
  const result = await query(
    `UPDATE course_faqs SET
       question = COALESCE($2, question),
       answer = COALESCE($3, answer),
       order_index = COALESCE($4, order_index)
     WHERE id = $1 RETURNING *`,
    [id, question, answer, order_index]
  );
  if (!result.rows.length) throw createError('FAQ not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/faqs/:id
const deleteFaq = asyncHandler(async (req, res) => {
  await query('DELETE FROM course_faqs WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'FAQ deleted.' });
});

// ─── TEACHER RESPONSIVENESS / SLA ───────────────────────────────────────────

// GET /api/teacher/sla  — metrics across the teacher's courses
const slaMetrics = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const params = isAdmin ? [] : [req.user.id];
  const courseFilter = isAdmin ? '' : 'AND c.teacher_id = $1';

  const result = await query(
    `SELECT
        COUNT(*) FILTER (WHERE cm.parent_id IS NULL) AS total_questions,
        COUNT(*) FILTER (WHERE cm.parent_id IS NULL AND cm.answered_at IS NOT NULL) AS answered,
        COUNT(*) FILTER (WHERE cm.parent_id IS NULL AND cm.answered_at IS NULL) AS pending,
        COUNT(*) FILTER (WHERE cm.parent_id IS NULL AND cm.answered_at IS NULL
                         AND cm.created_at < NOW() - INTERVAL '24 hours') AS overdue,
        AVG(EXTRACT(EPOCH FROM (cm.answered_at - cm.created_at))/3600)
          FILTER (WHERE cm.answered_at IS NOT NULL) AS avg_response_hours
     FROM comments cm
     JOIN courses c ON cm.course_id = c.id
     WHERE TRUE ${courseFilter}`,
    params
  );
  const row = result.rows[0];
  res.json({
    success: true,
    data: {
      total_questions: Number(row.total_questions),
      answered: Number(row.answered),
      pending: Number(row.pending),
      overdue: Number(row.overdue),
      avg_response_hours: row.avg_response_hours ? Math.round(Number(row.avg_response_hours) * 10) / 10 : null,
      sla_target_hours: 24,
    },
  });
});

// GET /api/teacher/sla/inbox  — unanswered questions, oldest first (overdue highlighted)
const slaInbox = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const params = isAdmin ? [] : [req.user.id];
  const courseFilter = isAdmin ? '' : 'AND c.teacher_id = $1';

  const result = await query(
    `SELECT cm.id, cm.body, cm.created_at, cm.lesson_id,
            l.title AS lesson_title, c.id AS course_id, c.title AS course_title,
            u.full_name AS student_name,
            (cm.created_at < NOW() - INTERVAL '24 hours') AS overdue,
            ROUND(EXTRACT(EPOCH FROM (NOW() - cm.created_at))/3600) AS waiting_hours
     FROM comments cm
     JOIN courses c ON cm.course_id = c.id
     JOIN lessons l ON cm.lesson_id = l.id
     JOIN users u ON cm.author_id = u.id
     WHERE cm.parent_id IS NULL AND cm.answered_at IS NULL ${courseFilter}
     ORDER BY cm.created_at ASC
     LIMIT 100`,
    params
  );
  res.json({ success: true, data: result.rows });
});

module.exports = {
  listFaqs, createFaq, updateFaq, deleteFaq,
  slaMetrics, slaInbox,
};
