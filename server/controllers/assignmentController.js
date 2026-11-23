const { sendGradeEmail } = require('../services/emailService');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { scaActivePlain } = require('../utils/courseAccess');

// ─── TEACHER: MANAGE ASSIGNMENTS ──────────────────────────────────────────

// GET /api/assignments?course_id=
const getAssignments = asyncHandler(async (req, res) => {
  const { course_id } = req.query;
  if (!course_id) throw createError('course_id is required.');

  // Teacher can only see their own course assignments
  if (req.user.role === 'teacher') {
    const owns = await query('SELECT id FROM courses WHERE id = $1 AND teacher_id = $2', [course_id, req.user.id]);
    if (!owns.rows.length) throw createError('Course not found or access denied.', 403);
  }
  // Students can only see assignments for courses they have active access to.
  if (req.user.role === 'student') {
    const access = await query(
      `SELECT id FROM student_course_access
       WHERE student_id = $1 AND course_id = $2 AND ${scaActivePlain()}`,
      [req.user.id, course_id]
    );
    if (!access.rows.length) throw createError('You do not have access to this course.', 403);
  }

  const result = await query(
    `SELECT a.id, a.title, a.description, a.due_date, a.max_grade, a.created_at,
            l.title AS lesson_title,
            COUNT(sub.id) AS submission_count,
            COUNT(sub.id) FILTER (WHERE sub.grade IS NOT NULL) AS graded_count
     FROM assignments a
     LEFT JOIN lessons l ON a.lesson_id = l.id
     LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
     WHERE a.course_id = $1
     GROUP BY a.id, l.title
     ORDER BY a.created_at DESC`,
    [course_id]
  );

  res.json({ success: true, data: result.rows });
});

// POST /api/assignments
const createAssignment = asyncHandler(async (req, res) => {
  const { course_id, lesson_id, title, description, due_date, max_grade } = req.body;

  if (!course_id || !title) throw createError('course_id and title are required.');

  if (req.user.role === 'teacher') {
    const owns = await query('SELECT id FROM courses WHERE id = $1 AND teacher_id = $2', [course_id, req.user.id]);
    if (!owns.rows.length) throw createError('You can only create assignments for your own courses.', 403);
  }

  const result = await query(
    `INSERT INTO assignments (id, course_id, lesson_id, title, description, due_date, max_grade)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [uuidv4(), course_id, lesson_id || null, title, description, due_date || null, max_grade || 100]
  );

  res.status(201).json({ success: true, message: 'Assignment created.', data: result.rows[0] });
});

// PUT /api/assignments/:id
const updateAssignment = asyncHandler(async (req, res) => {
  const { title, description, due_date, max_grade } = req.body;

  // Verify ownership
  const existing = await query(
    `SELECT a.id, c.teacher_id FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = $1`,
    [req.params.id]
  );
  if (!existing.rows.length) throw createError('Assignment not found.', 404);
  if (req.user.role === 'teacher' && existing.rows[0].teacher_id !== req.user.id) {
    throw createError('You can only edit your own assignments.', 403);
  }

  const result = await query(
    `UPDATE assignments SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       due_date = COALESCE($3, due_date),
       max_grade = COALESCE($4, max_grade),
       updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [title, description, due_date, max_grade, req.params.id]
  );

  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/assignments/:id
const deleteAssignment = asyncHandler(async (req, res) => {
  const existing = await query(
    `SELECT a.id, c.teacher_id FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = $1`,
    [req.params.id]
  );
  if (!existing.rows.length) throw createError('Assignment not found.', 404);
  if (req.user.role === 'teacher' && existing.rows[0].teacher_id !== req.user.id) {
    throw createError('Access denied.', 403);
  }

  await query('DELETE FROM assignments WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Assignment deleted.' });
});

// ─── TEACHER: VIEW SUBMISSIONS ────────────────────────────────────────────

// GET /api/assignments/:id/submissions
const getSubmissions = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT sub.id, sub.submission_text, sub.file_url, sub.grade,
            sub.feedback, sub.submitted_at, sub.graded_at,
            u.id AS student_id, u.full_name AS student_name, u.email AS student_email,
            u.profile_photo AS student_photo
     FROM assignment_submissions sub
     JOIN users u ON sub.student_id = u.id
     WHERE sub.assignment_id = $1
     ORDER BY sub.submitted_at DESC`,
    [req.params.id]
  );

  res.json({ success: true, data: result.rows });
});

// PUT /api/assignments/:assignmentId/submissions/:submissionId/grade
const gradeSubmission = asyncHandler(async (req, res) => {
  const { grade, feedback } = req.body;
  const { assignmentId, submissionId } = req.params;

  if (grade === undefined) throw createError('grade is required.');

  // Verify teacher owns the course
  const check = await query(
    `SELECT a.max_grade, c.teacher_id
     FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = $1`,
    [assignmentId]
  );
  if (!check.rows.length) throw createError('Assignment not found.', 404);
  if (req.user.role === 'teacher' && check.rows[0].teacher_id !== req.user.id) {
    throw createError('Access denied.', 403);
  }

  const maxGrade = check.rows[0].max_grade;
  if (grade < 0 || grade > maxGrade) {
    throw createError(`Grade must be between 0 and ${maxGrade}.`);
  }

  const result = await query(
    `UPDATE assignment_submissions
     SET grade = $1, feedback = $2, graded_by = $3, graded_at = NOW()
     WHERE id = $4 AND assignment_id = $5
     RETURNING *`,
    [grade, feedback || null, req.user.id, submissionId, assignmentId]
  );

  if (!result.rows.length) throw createError('Submission not found.', 404);
  // Notify student by email
  const stuQ = await query('SELECT u.full_name, u.email FROM users u JOIN assignment_submissions sub ON sub.student_id = u.id WHERE sub.id = $1', [submissionId]);
  if (stuQ.rows.length) {
    sendGradeEmail({ email: stuQ.rows[0].email, fullName: stuQ.rows[0].full_name, assignmentTitle: check.rows[0] ? 'Assignment' : 'Assignment', grade, maxGrade, feedback }).catch(() => {});
  }

  res.json({ success: true, message: 'Submission graded.', data: result.rows[0] });
});

// ─── STUDENT: SUBMIT ASSIGNMENT ───────────────────────────────────────────

// POST /api/assignments/:id/submit
const submitAssignment = asyncHandler(async (req, res) => {
  const { submission_text } = req.body;
  const studentId = req.user.id;
  const assignmentId = req.params.id;

  // Verify student has access to the course
  const assignment = await query(
    `SELECT a.*, a.due_date FROM assignments a WHERE a.id = $1`,
    [assignmentId]
  );
  if (!assignment.rows.length) throw createError('Assignment not found.', 404);
  const a = assignment.rows[0];

  // Check student access to course
  const access = await query(
    `SELECT id FROM student_course_access WHERE student_id = $1 AND course_id = $2 AND ${scaActivePlain()}`,
    [studentId, a.course_id]
  );
  if (!access.rows.length) throw createError('You do not have access to this course.', 403);

  // Check due date
  if (a.due_date && new Date() > new Date(a.due_date)) {
    throw createError('Assignment due date has passed.');
  }

  const fileUrl = req.file ? `/uploads/assignments/${req.file.filename}` : null;

  if (!submission_text && !fileUrl) {
    throw createError('Submission must include text or a file.');
  }

  const result = await query(
    `INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, file_url)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET submission_text = $4, file_url = COALESCE($5, assignment_submissions.file_url), submitted_at = NOW()
     RETURNING *`,
    [uuidv4(), assignmentId, studentId, submission_text || null, fileUrl]
  );

  res.status(201).json({ success: true, message: 'Assignment submitted.', data: result.rows[0] });
});

// GET /api/assignments/:id/my-submission
const getMySubmission = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT sub.*, a.title AS assignment_title, a.max_grade, a.due_date
     FROM assignment_submissions sub
     JOIN assignments a ON sub.assignment_id = a.id
     WHERE sub.assignment_id = $1 AND sub.student_id = $2`,
    [req.params.id, req.user.id]
  );

  res.json({ success: true, data: result.rows[0] || null });
});

module.exports = {
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getSubmissions, gradeSubmission,
  submitAssignment, getMySubmission
};
