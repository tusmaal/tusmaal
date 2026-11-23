const { sendWelcomeEmail, sendEnrollmentEmail, sendPasswordResetEmail } = require('../services/emailService');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { qualifyReferral, logEvent } = require('../services/growthService');
const { EXPIRES_INTERVAL_SQL, scaActive, scaActivePlain } = require('../utils/courseAccess');

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────

// GET /api/admin/users?role=student&page=1&limit=20&search=
const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let conditions = ['1=1'];
  const values = [];
  let i = 1;

  if (role) { conditions.push(`u.role = $${i++}`); values.push(role); }
  if (search) {
    conditions.push(`(u.full_name ILIKE $${i} OR u.email ILIKE $${i})`);
    values.push(`%${search}%`);
    i++;
  }

  const where = conditions.join(' AND ');

  const countResult = await query(`SELECT COUNT(*) FROM users u WHERE ${where}`, values);
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT u.id, u.full_name, u.email, u.role, u.phone, u.is_active, u.is_approved,
            u.last_login, u.created_at, u.profile_photo
     FROM users u WHERE ${where}
     ORDER BY u.created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
  });
});

// POST /api/admin/users  — create student or teacher account
const createUser = asyncHandler(async (req, res) => {
  const { full_name, email, password, role, phone, referral_code } = req.body;

  if (!full_name || !email || !password || !role) {
    throw createError('full_name, email, password, and role are required.');
  }
  if (!['student', 'teacher'].includes(role)) {
    throw createError('Role must be student or teacher.');
  }
  if (password.length < 8) {
    throw createError('Password must be at least 8 characters.');
  }

  const password_hash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  const ownReferralCode = id.replace(/-/g, '').slice(0, 8).toUpperCase();

  // Resolve referrer (optional) — only students can be referred.
  let referrerId = null;
  if (referral_code && role === 'student') {
    const ref = await query('SELECT id FROM users WHERE referral_code = $1', [referral_code.trim().toUpperCase()]);
    if (ref.rows.length) referrerId = ref.rows[0].id;
  }

  const result = await query(
    `INSERT INTO users (id, full_name, email, password_hash, role, phone, referral_code, referred_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, full_name, email, role, phone, is_active, created_at`,
    [id, full_name, email.toLowerCase().trim(), password_hash, role, phone || null, ownReferralCode, referrerId]
  );

  // Record the referral (qualifies later, when the student first gets course access).
  if (referrerId) {
    await query(
      `INSERT INTO referrals (id, referrer_id, referred_user_id, status)
       VALUES ($1, $2, $3, 'pending') ON CONFLICT (referred_user_id) DO NOTHING`,
      [uuidv4(), referrerId, id]
    );
  }

  // Send welcome email in background
  sendWelcomeEmail({ email: result.rows[0].email, fullName: result.rows[0].full_name, password }).catch(() => {});

  res.status(201).json({ success: true, message: `${role} account created.`, data: result.rows[0] });
});

// GET /api/admin/users/:id
const getUser = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, full_name, email, role, phone, bio, profile_photo, is_active, is_approved, last_login, created_at
     FROM users WHERE id = $1`,
    [req.params.id]
  );
  if (!result.rows.length) throw createError('User not found.', 404);

  // If student, also return their course access list
  const user = result.rows[0];
  if (user.role === 'student') {
    const access = await query(
      `SELECT c.id, c.title, c.slug, c.thumbnail, sca.is_active, sca.granted_at,
              u.full_name AS teacher_name
       FROM student_course_access sca
       JOIN courses c ON sca.course_id = c.id
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE sca.student_id = $1`,
      [user.id]
    );
    user.course_access = access.rows;
  }

  res.json({ success: true, data: user });
});

// PUT /api/admin/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const { full_name, phone, is_active, is_approved } = req.body;
  const fields = [];
  const values = [];
  let i = 1;

  if (full_name) { fields.push(`full_name = $${i++}`); values.push(full_name); }
  if (phone !== undefined) { fields.push(`phone = $${i++}`); values.push(phone); }
  if (is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(is_active); }
  if (is_approved !== undefined) { fields.push(`is_approved = $${i++}`); values.push(is_approved); }

  if (!fields.length) throw createError('Nothing to update.');
  fields.push(`updated_at = NOW()`);
  values.push(req.params.id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, full_name, email, role, phone, is_active, is_approved`,
    values
  );
  if (!result.rows.length) throw createError('User not found.', 404);

  res.json({ success: true, message: 'User updated.', data: result.rows[0] });
});

// DELETE /api/admin/users/:id (deactivate only — no hard delete)
const deactivateUser = asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND role != 'admin'
     RETURNING id, full_name`,
    [req.params.id]
  );
  if (!result.rows.length) throw createError('User not found or cannot deactivate admin.', 404);

  res.json({ success: true, message: 'User deactivated.', data: result.rows[0] });
});

// PUT /api/admin/users/:id/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8) throw createError('Password must be at least 8 characters.');

  const hash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.params.id]);

  res.json({ success: true, message: 'Password reset successfully.' });
});

// ─── COURSE ACCESS CONTROL ─────────────────────────────────────────────────

// GET /api/admin/students/:studentId/access
const getStudentAccess = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT sca.id, sca.course_id, c.title, c.thumbnail, c.price,
            sca.is_active, sca.granted_at, sca.expires_at, sca.revoked_at, sca.notes,
            u.full_name AS teacher_name
     FROM student_course_access sca
     JOIN courses c ON sca.course_id = c.id
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE sca.student_id = $1
     ORDER BY sca.granted_at DESC`,
    [req.params.studentId]
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/admin/students/:studentId/access — grant course access
const grantAccess = asyncHandler(async (req, res) => {
  const { course_id, notes } = req.body;
  const { studentId } = req.params;

  if (!course_id) throw createError('course_id is required.');

  // Verify student exists
  const student = await query(`SELECT id, role FROM users WHERE id = $1`, [studentId]);
  if (!student.rows.length || student.rows[0].role !== 'student') {
    throw createError('Student not found.', 404);
  }

  const result = await query(
    `INSERT INTO student_course_access (student_id, course_id, granted_by, notes, is_active, expires_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW() + ${EXPIRES_INTERVAL_SQL})
     ON CONFLICT (student_id, course_id)
     DO UPDATE SET is_active = TRUE, granted_by = $3, granted_at = NOW(), revoked_at = NULL, notes = $4,
                   expires_at = NOW() + ${EXPIRES_INTERVAL_SQL}
     RETURNING *`,
    [studentId, course_id, req.user.id, notes || null]
  );

  // Granting a course approves the student — unlocks dashboard/login access.
  await query(`UPDATE users SET is_approved = TRUE WHERE id = $1`, [studentId]);

  // Update total_students count
  await query(
    `UPDATE courses SET total_students = (
       SELECT COUNT(*) FROM student_course_access
       WHERE course_id = $1 AND ${scaActivePlain()}
     ) WHERE id = $1`,
    [course_id]
  );

  // Send enrollment email in background
  const [stuInfo, courseInfo] = await Promise.all([
    query('SELECT full_name, email FROM users WHERE id = $1', [studentId]),
    query('SELECT c.title, u.full_name AS teacher_name FROM courses c LEFT JOIN users u ON c.teacher_id = u.id WHERE c.id = $1', [course_id])
  ]);
  if (stuInfo.rows.length && courseInfo.rows.length) {
    sendEnrollmentEmail({
      email: stuInfo.rows[0].email,
      fullName: stuInfo.rows[0].full_name,
      courseName: courseInfo.rows[0].title,
      teacherName: courseInfo.rows[0].teacher_name
    }).catch(() => {});
  }

  // Growth hooks: log the enrollment for the funnel and qualify any referral.
  logEvent({ userId: studentId, type: 'enroll', courseId: course_id }).catch(() => {});
  qualifyReferral(studentId).catch(() => {});

  res.status(201).json({ success: true, message: 'Course access granted.', data: result.rows[0] });
});

// DELETE /api/admin/students/:studentId/access/:courseId — revoke access
const revokeAccess = asyncHandler(async (req, res) => {
  const { studentId, courseId } = req.params;

  const result = await query(
    `UPDATE student_course_access
     SET is_active = FALSE, revoked_at = NOW()
     WHERE student_id = $1 AND course_id = $2
     RETURNING *`,
    [studentId, courseId]
  );
  if (!result.rows.length) throw createError('Access record not found.', 404);

  await query(
    `UPDATE courses SET total_students = (
       SELECT COUNT(*) FROM student_course_access WHERE course_id = $1 AND ${scaActivePlain()}
     ) WHERE id = $1`,
    [courseId]
  );

  res.json({ success: true, message: 'Course access revoked.' });
});

// ─── PAYMENT LOG ───────────────────────────────────────────────────────────

// GET /api/admin/payments
const getPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT pl.*, s.full_name AS student_name, s.email AS student_email,
            c.title AS course_title, rb.full_name AS recorded_by_name
     FROM payment_logs pl
     JOIN users s ON pl.student_id = s.id
     JOIN courses c ON pl.course_id = c.id
     LEFT JOIN users rb ON pl.recorded_by = rb.id
     ORDER BY pl.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const total = (await query('SELECT COUNT(*) FROM payment_logs')).rows[0].count;

  res.json({ success: true, data: result.rows, pagination: { total: parseInt(total), page: parseInt(page) } });
});

// POST /api/admin/payments
const createPayment = asyncHandler(async (req, res) => {
  const { student_id, course_id, amount, currency = 'USD', payment_method, payment_reference, payment_date, notes } = req.body;

  if (!student_id || !course_id || !amount || !payment_date) {
    throw createError('student_id, course_id, amount, and payment_date are required.');
  }

  const result = await query(
    `INSERT INTO payment_logs (student_id, course_id, recorded_by, amount, currency, payment_method, payment_reference, payment_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [student_id, course_id, req.user.id, amount, currency, payment_method, payment_reference, payment_date, notes]
  );

  res.status(201).json({ success: true, message: 'Payment recorded.', data: result.rows[0] });
});

// ─── DASHBOARD STATS ───────────────────────────────────────────────────────

// GET /api/admin/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const [students, teachers, courses, published, recentStudents, recentPayments] = await Promise.all([
    query(`SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = TRUE`),
    query(`SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = TRUE`),
    query(`SELECT COUNT(*) FROM courses`),
    query(`SELECT COUNT(*) FROM courses WHERE is_published = TRUE`),
    query(`SELECT id, full_name, email, created_at FROM users WHERE role = 'student' ORDER BY created_at DESC LIMIT 5`),
    query(`SELECT pl.amount, pl.currency, pl.payment_date, u.full_name AS student, c.title AS course
           FROM payment_logs pl JOIN users u ON pl.student_id = u.id JOIN courses c ON pl.course_id = c.id
           ORDER BY pl.created_at DESC LIMIT 5`)
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        total_students: parseInt(students.rows[0].count),
        total_teachers: parseInt(teachers.rows[0].count),
        total_courses: parseInt(courses.rows[0].count),
        published_courses: parseInt(published.rows[0].count)
      },
      recent_students: recentStudents.rows,
      recent_payments: recentPayments.rows
    }
  });
});

// ─── REPORTS ───────────────────────────────────────────────────────────────

// GET /api/admin/reports/student-progress/:studentId
const getStudentProgress = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.title AS course, c.id AS course_id,
            COUNT(l.id) AS total_lessons,
            COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE) AS completed_lessons,
            ROUND(COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE) * 100.0 / NULLIF(COUNT(l.id), 0), 1) AS progress_pct
     FROM student_course_access sca
     JOIN courses c ON sca.course_id = c.id
     JOIN lessons l ON l.course_id = c.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
     WHERE sca.student_id = $1 AND ${scaActive('sca')}
     GROUP BY c.id, c.title`,
    [req.params.studentId]
  );

  res.json({ success: true, data: result.rows });
});

module.exports = {
  getUsers, createUser, getUser, updateUser, deactivateUser, resetPassword,
  getStudentAccess, grantAccess, revokeAccess,
  getPayments, createPayment,
  getDashboard, getStudentProgress
};
