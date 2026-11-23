const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { EXPIRES_INTERVAL_SQL } = require('../utils/courseAccess');

// GET /api/courses/:courseId/cohorts
const listCohorts = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const result = await query(
    `SELECT ch.*,
            COUNT(ce.id) AS enrolled_count
     FROM cohorts ch
     LEFT JOIN cohort_enrollments ce ON ce.cohort_id = ch.id
     WHERE ch.course_id = $1
     GROUP BY ch.id
     ORDER BY ch.start_date DESC`,
    [courseId]
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/courses/:courseId/cohorts
const createCohort = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { name, start_date, end_date, drip_enabled = false, capacity } = req.body;
  if (!name || !start_date) throw createError('Name and start date are required.');
  const result = await query(
    `INSERT INTO cohorts (id, course_id, name, start_date, end_date, drip_enabled, capacity, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [uuidv4(), courseId, name, start_date, end_date || null, !!drip_enabled, capacity || null, req.user.id]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// PUT /api/cohorts/:id
const updateCohort = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, start_date, end_date, drip_enabled, capacity, is_active } = req.body;
  const result = await query(
    `UPDATE cohorts SET
       name = COALESCE($2, name),
       start_date = COALESCE($3, start_date),
       end_date = COALESCE($4, end_date),
       drip_enabled = COALESCE($5, drip_enabled),
       capacity = COALESCE($6, capacity),
       is_active = COALESCE($7, is_active)
     WHERE id = $1 RETURNING *`,
    [id, name, start_date, end_date, drip_enabled, capacity, is_active]
  );
  if (!result.rows.length) throw createError('Cohort not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/cohorts/:id
const deleteCohort = asyncHandler(async (req, res) => {
  await query('DELETE FROM cohorts WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Cohort deleted.' });
});

// GET /api/cohorts/:id/students
const getCohortStudents = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ce.id, ce.enrolled_at, u.id AS student_id, u.full_name, u.email
     FROM cohort_enrollments ce
     JOIN users u ON ce.student_id = u.id
     WHERE ce.cohort_id = $1
     ORDER BY u.full_name`,
    [req.params.id]
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/cohorts/:id/enroll  body: { student_id }
// Enrolls the student in the cohort AND grants course access.
const enrollStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { student_id } = req.body;
  if (!student_id) throw createError('student_id is required.');

  const cohort = await query('SELECT * FROM cohorts WHERE id = $1', [id]);
  if (!cohort.rows.length) throw createError('Cohort not found.', 404);

  if (cohort.rows[0].capacity != null) {
    const count = await query('SELECT COUNT(*) FROM cohort_enrollments WHERE cohort_id = $1', [id]);
    if (Number(count.rows[0].count) >= Number(cohort.rows[0].capacity)) {
      throw createError('Cohort is full.', 400);
    }
  }

  await query(
    `INSERT INTO cohort_enrollments (id, cohort_id, student_id)
     VALUES ($1,$2,$3) ON CONFLICT (cohort_id, student_id) DO NOTHING`,
    [uuidv4(), id, student_id]
  );
  await query(
    `INSERT INTO student_course_access (id, student_id, course_id, granted_by, notes, expires_at)
     VALUES ($1,$2,$3,$4,'Cohort enrollment', NOW() + ${EXPIRES_INTERVAL_SQL})
     ON CONFLICT (student_id, course_id) DO UPDATE SET is_active = TRUE, revoked_at = NULL,
       expires_at = NOW() + ${EXPIRES_INTERVAL_SQL}`,
    [uuidv4(), student_id, cohort.rows[0].course_id, req.user.id]
  );
  res.json({ success: true, message: 'Student enrolled in cohort.' });
});

// DELETE /api/cohorts/:id/students/:studentId
const removeStudent = asyncHandler(async (req, res) => {
  await query('DELETE FROM cohort_enrollments WHERE cohort_id = $1 AND student_id = $2',
    [req.params.id, req.params.studentId]);
  res.json({ success: true, message: 'Student removed from cohort.' });
});

// PUT /api/sections/:sectionId/drip  body: { drip_offset_days }
const setSectionDrip = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const { drip_offset_days = 0 } = req.body;
  const result = await query(
    `UPDATE sections SET drip_offset_days = $2 WHERE id = $1 RETURNING id, title, drip_offset_days`,
    [sectionId, Math.max(0, Number(drip_offset_days) || 0)]
  );
  if (!result.rows.length) throw createError('Section not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

module.exports = {
  listCohorts, createCohort, updateCohort, deleteCohort,
  getCohortStudents, enrollStudent, removeStudent, setSectionDrip,
};
