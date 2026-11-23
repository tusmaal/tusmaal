const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { scaActive, scaActivePlain } = require('../utils/courseAccess');

// Convert array of objects to CSV string
const toCSV = (rows, columns) => {
  if (!rows.length) return columns.join(',') + '\n';
  const header = columns.join(',');
  const lines = rows.map(row =>
    columns.map(col => {
      const val = row[col] ?? '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
    }).join(',')
  );
  return [header, ...lines].join('\n');
};

const sendCSV = (res, csv, filename) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

// GET /api/reports/overview  (admin)
const overviewReport = asyncHandler(async (req, res) => {
  const [users, courses, enrollments, completions, revenue] = await Promise.all([
    query(`SELECT
             COUNT(*) FILTER (WHERE role = 'student') AS total_students,
             COUNT(*) FILTER (WHERE role = 'teacher') AS total_teachers,
             COUNT(*) FILTER (WHERE role = 'student' AND is_active = FALSE) AS inactive_students,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d
           FROM users`),

    query(`SELECT
             COUNT(*) AS total_courses,
             COUNT(*) FILTER (WHERE is_published = TRUE) AS published,
             COUNT(*) FILTER (WHERE is_published = FALSE) AS drafts,
             SUM(total_students) AS total_enrollments_cached
           FROM courses`),

    query(`SELECT COUNT(*) AS total_active_enrollments
           FROM student_course_access WHERE ${scaActivePlain()}`),

    query(`SELECT COUNT(*) AS total_certificates FROM certificates`),

    query(`SELECT
             COALESCE(SUM(amount), 0) AS total_revenue,
             COALESCE(SUM(amount) FILTER (WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'), 0) AS revenue_30d,
             COUNT(*) AS total_payments
           FROM payment_logs`)
  ]);

  res.json({
    success: true,
    data: {
      users: users.rows[0],
      courses: courses.rows[0],
      enrollments: enrollments.rows[0],
      completions: completions.rows[0],
      revenue: revenue.rows[0]
    }
  });
});

// GET /api/reports/enrollments?format=json|csv
const enrollmentsReport = asyncHandler(async (req, res) => {
  const { format = 'json', from, to } = req.query;

  let dateFilter = '';
  const vals = [];
  if (from) { dateFilter += ` AND sca.granted_at >= $${vals.length + 1}`; vals.push(from); }
  if (to)   { dateFilter += ` AND sca.granted_at <= $${vals.length + 1}`; vals.push(to); }

  const result = await query(
    `SELECT u.full_name AS student_name, u.email AS student_email, u.phone,
            c.title AS course_title, c.price, c.level,
            t.full_name AS teacher_name,
            sca.granted_at AS enrolled_at, sca.is_active,
            gb.full_name AS granted_by
     FROM student_course_access sca
     JOIN users u ON sca.student_id = u.id
     JOIN courses c ON sca.course_id = c.id
     LEFT JOIN users t ON c.teacher_id = t.id
     LEFT JOIN users gb ON sca.granted_by = gb.id
     WHERE 1=1 ${dateFilter}
     ORDER BY sca.granted_at DESC`,
    vals
  );

  if (format === 'csv') {
    const csv = toCSV(result.rows, [
      'student_name', 'student_email', 'phone', 'course_title',
      'price', 'level', 'teacher_name', 'enrolled_at', 'is_active', 'granted_by'
    ]);
    return sendCSV(res, csv, 'enrollments.csv');
  }

  res.json({ success: true, total: result.rows.length, data: result.rows });
});

// GET /api/reports/students?format=json|csv
const studentsReport = asyncHandler(async (req, res) => {
  const { format = 'json' } = req.query;

  const result = await query(
    `SELECT u.full_name, u.email, u.phone, u.is_active, u.created_at,
            COUNT(DISTINCT sca.course_id) AS courses_enrolled,
            COUNT(DISTINCT cert.id) AS certificates_earned,
            MAX(lp.updated_at) AS last_activity
     FROM users u
     LEFT JOIN student_course_access sca ON sca.student_id = u.id AND ${scaActive('sca')}
     LEFT JOIN certificates cert ON cert.student_id = u.id
     LEFT JOIN lesson_progress lp ON lp.student_id = u.id
     WHERE u.role = 'student'
     GROUP BY u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at
     ORDER BY u.created_at DESC`
  );

  if (format === 'csv') {
    const csv = toCSV(result.rows, [
      'full_name', 'email', 'phone', 'is_active', 'courses_enrolled',
      'certificates_earned', 'last_activity', 'created_at'
    ]);
    return sendCSV(res, csv, 'students.csv');
  }

  res.json({ success: true, total: result.rows.length, data: result.rows });
});

// GET /api/reports/courses?format=json|csv
const coursesReport = asyncHandler(async (req, res) => {
  const { format = 'json' } = req.query;

  const result = await query(
    `SELECT c.title, c.level, c.language, c.price, c.is_published,
            cat.name AS category, t.full_name AS teacher,
            c.total_students, c.total_lessons,
            COUNT(DISTINCT cert.id) AS completions,
            COALESCE(AVG(qa.percentage), 0)::numeric(5,1) AS avg_quiz_score,
            c.created_at
     FROM courses c
     LEFT JOIN categories cat ON c.category_id = cat.id
     LEFT JOIN users t ON c.teacher_id = t.id
     LEFT JOIN certificates cert ON cert.course_id = c.id
     LEFT JOIN quizzes q ON q.course_id = c.id
     LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
     GROUP BY c.id, cat.name, t.full_name
     ORDER BY c.total_students DESC`
  );

  if (format === 'csv') {
    const csv = toCSV(result.rows, [
      'title', 'category', 'teacher', 'level', 'language', 'price',
      'is_published', 'total_students', 'total_lessons', 'completions',
      'avg_quiz_score', 'created_at'
    ]);
    return sendCSV(res, csv, 'courses.csv');
  }

  res.json({ success: true, total: result.rows.length, data: result.rows });
});

// GET /api/reports/revenue?format=json|csv
const revenueReport = asyncHandler(async (req, res) => {
  const { format = 'json', from, to } = req.query;
  let dateFilter = '';
  const vals = [];
  if (from) { dateFilter += ` AND pl.payment_date >= $${vals.length+1}`; vals.push(from); }
  if (to)   { dateFilter += ` AND pl.payment_date <= $${vals.length+1}`; vals.push(to); }

  const result = await query(
    `SELECT pl.payment_date, pl.amount, pl.currency, pl.payment_method,
            pl.payment_reference, u.full_name AS student_name, u.email,
            c.title AS course_title, rb.full_name AS recorded_by
     FROM payment_logs pl
     JOIN users u ON pl.student_id = u.id
     JOIN courses c ON pl.course_id = c.id
     LEFT JOIN users rb ON pl.recorded_by = rb.id
     WHERE 1=1 ${dateFilter}
     ORDER BY pl.payment_date DESC`,
    vals
  );

  const totalRevenue = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  if (format === 'csv') {
    const csv = toCSV(result.rows, [
      'payment_date', 'student_name', 'email', 'course_title',
      'amount', 'currency', 'payment_method', 'payment_reference', 'recorded_by'
    ]);
    return sendCSV(res, csv, 'revenue.csv');
  }

  res.json({ success: true, total_revenue: totalRevenue.toFixed(2), total_payments: result.rows.length, data: result.rows });
});

// GET /api/reports/monthly-stats
const monthlyStats = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT
       TO_CHAR(months.month, 'YYYY-MM') AS month,
       COALESCE(new_students.count, 0) AS new_students,
       COALESCE(enrollments.count, 0) AS new_enrollments,
       COALESCE(revenue.total, 0) AS revenue,
       COALESCE(certs.count, 0) AS certificates_issued
     FROM (
       SELECT generate_series(
         DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
         DATE_TRUNC('month', NOW()),
         '1 month'::interval
       ) AS month
     ) months
     LEFT JOIN (
       SELECT DATE_TRUNC('month', created_at) AS m, COUNT(*) AS count
       FROM users WHERE role = 'student' GROUP BY m
     ) new_students ON new_students.m = months.month
     LEFT JOIN (
       SELECT DATE_TRUNC('month', granted_at) AS m, COUNT(*) AS count
       FROM student_course_access GROUP BY m
     ) enrollments ON enrollments.m = months.month
     LEFT JOIN (
       SELECT DATE_TRUNC('month', payment_date::timestamp) AS m, SUM(amount) AS total
       FROM payment_logs GROUP BY m
     ) revenue ON revenue.m = months.month
     LEFT JOIN (
       SELECT DATE_TRUNC('month', issued_at) AS m, COUNT(*) AS count
       FROM certificates GROUP BY m
     ) certs ON certs.m = months.month
     ORDER BY months.month`
  );

  res.json({ success: true, data: result.rows });
});

module.exports = { overviewReport, enrollmentsReport, studentsReport, coursesReport, revenueReport, monthlyStats };
