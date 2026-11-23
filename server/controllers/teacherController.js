const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { scaActive, scaActivePlain } = require('../utils/courseAccess');

// GET /api/teacher/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const teacherId = req.user.id;

  const [courses, totalStudents, pendingGrades, recentSubmissions] = await Promise.all([
    // My courses with student counts
    query(
      `SELECT c.id, c.title, c.slug, c.thumbnail, c.is_published, c.level,
              c.total_students, c.created_at, cat.name AS category,
              COUNT(DISTINCT l.id) AS lesson_count
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN lessons l ON l.course_id = c.id
       WHERE c.teacher_id = $1
       GROUP BY c.id, cat.name
       ORDER BY c.created_at DESC`,
      [teacherId]
    ),

    // Total unique students across all my courses
    query(
      `SELECT COUNT(DISTINCT sca.student_id) AS total
       FROM student_course_access sca
       JOIN courses c ON sca.course_id = c.id
       WHERE c.teacher_id = $1 AND ${scaActive('sca')}`,
      [teacherId]
    ),

    // Ungraded submissions waiting
    query(
      `SELECT COUNT(*) AS pending
       FROM assignment_submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE c.teacher_id = $1 AND sub.grade IS NULL`,
      [teacherId]
    ),

    // Recent submissions
    query(
      `SELECT sub.id, sub.submitted_at, sub.grade,
              u.full_name AS student_name,
              a.title AS assignment_title,
              c.title AS course_title
       FROM assignment_submissions sub
       JOIN users u ON sub.student_id = u.id
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE c.teacher_id = $1
       ORDER BY sub.submitted_at DESC LIMIT 10`,
      [teacherId]
    )
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        total_courses: courses.rows.length,
        published_courses: courses.rows.filter(c => c.is_published).length,
        total_students: parseInt(totalStudents.rows[0]?.total || 0),
        pending_grades: parseInt(pendingGrades.rows[0]?.pending || 0)
      },
      courses: courses.rows,
      recent_submissions: recentSubmissions.rows
    }
  });
});

// GET /api/teacher/courses/:courseId/students
const getCourseStudents = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Verify teacher owns this course
  const owns = await query(
    'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
    [courseId, req.user.id]
  );
  if (!owns.rows.length && req.user.role !== 'admin') {
    throw createError('Course not found or access denied.', 403);
  }

  const result = await query(
    `SELECT u.id, u.full_name, u.email, u.profile_photo, u.phone,
            sca.granted_at AS enrolled_at,
            COUNT(DISTINCT l.id) AS total_lessons,
            COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE) AS completed_lessons,
            ROUND(
              COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE) * 100.0
              / NULLIF(COUNT(DISTINCT l.id), 0), 1
            ) AS progress_pct,
            MAX(lp.updated_at) AS last_activity,
            cert.issued_at AS certificate_issued_at
     FROM student_course_access sca
     JOIN users u ON sca.student_id = u.id
     LEFT JOIN lessons l ON l.course_id = $1
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = u.id
     LEFT JOIN certificates cert ON cert.student_id = u.id AND cert.course_id = $1
     WHERE sca.course_id = $1 AND ${scaActive('sca')}
     GROUP BY u.id, u.full_name, u.email, u.profile_photo, u.phone, sca.granted_at, cert.issued_at
     ORDER BY sca.granted_at DESC`,
    [courseId]
  );

  res.json({ success: true, data: result.rows });
});

// GET /api/teacher/courses/:courseId/analytics
const getCourseAnalytics = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const owns = await query(
    'SELECT id, title FROM courses WHERE id = $1 AND teacher_id = $2',
    [courseId, req.user.id]
  );
  if (!owns.rows.length && req.user.role !== 'admin') {
    throw createError('Access denied.', 403);
  }

  const [lessonStats, quizStats, completionByLesson] = await Promise.all([
    // Per-lesson completion rates
    query(
      `SELECT l.id, l.title, l.order_index, s.title AS section_title,
              COUNT(DISTINCT sca.student_id) AS total_students,
              COUNT(DISTINCT lp.student_id) FILTER (WHERE lp.is_completed = TRUE) AS completed_count,
              ROUND(
                COUNT(DISTINCT lp.student_id) FILTER (WHERE lp.is_completed = TRUE) * 100.0
                / NULLIF(COUNT(DISTINCT sca.student_id), 0), 1
              ) AS completion_rate
       FROM lessons l
       JOIN sections s ON l.section_id = s.id
       LEFT JOIN student_course_access sca ON sca.course_id = l.course_id AND ${scaActive('sca')}
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id
       WHERE l.course_id = $1
       GROUP BY l.id, l.title, l.order_index, s.title
       ORDER BY l.order_index`,
      [courseId]
    ),

    // Quiz pass rates
    query(
      `SELECT q.id, q.title,
              COUNT(DISTINCT qa.student_id) AS attempted_by,
              COUNT(DISTINCT qa.student_id) FILTER (WHERE qa.passed = TRUE) AS passed_count,
              ROUND(AVG(qa.percentage), 1) AS avg_score
       FROM quizzes q
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
       WHERE q.course_id = $1
       GROUP BY q.id, q.title`,
      [courseId]
    ),

    // Overall completion buckets
    query(
      `SELECT
         SUM(CASE WHEN pct = 0 THEN 1 ELSE 0 END) AS not_started,
         SUM(CASE WHEN pct > 0 AND pct < 50 THEN 1 ELSE 0 END) AS in_progress_low,
         SUM(CASE WHEN pct >= 50 AND pct < 100 THEN 1 ELSE 0 END) AS in_progress_high,
         SUM(CASE WHEN pct = 100 THEN 1 ELSE 0 END) AS completed
       FROM (
         SELECT sca.student_id,
           COALESCE(ROUND(
             COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE) * 100.0
             / NULLIF(COUNT(l.id), 0), 1
           ), 0) AS pct
         FROM student_course_access sca
         LEFT JOIN lessons l ON l.course_id = sca.course_id
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = sca.student_id
         WHERE sca.course_id = $1 AND ${scaActive('sca')}
         GROUP BY sca.student_id
       ) sub`,
      [courseId]
    )
  ]);

  res.json({
    success: true,
    data: {
      course: owns.rows[0],
      lesson_stats: lessonStats.rows,
      quiz_stats: quizStats.rows,
      completion_buckets: completionByLesson.rows[0]
    }
  });
});

// GET /api/teacher/students/:studentId/progress?course_id=
const getStudentDetailProgress = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { course_id } = req.query;

  if (!course_id) throw createError('course_id is required.');

  // Verify teacher owns the course
  const owns = await query('SELECT id FROM courses WHERE id = $1 AND teacher_id = $2', [course_id, req.user.id]);
  if (!owns.rows.length && req.user.role !== 'admin') throw createError('Access denied.', 403);

  const [student, lessonProgress, quizResults, submissions] = await Promise.all([
    query(`SELECT id, full_name, email, profile_photo, phone FROM users WHERE id = $1`, [studentId]),

    query(
      `SELECT l.id, l.title, l.content_type, l.duration_minutes, s.title AS section_title,
              lp.is_completed, lp.completed_at, lp.watch_time_seconds
       FROM lessons l
       JOIN sections s ON l.section_id = s.id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
       WHERE l.course_id = $2
       ORDER BY l.order_index`,
      [studentId, course_id]
    ),

    query(
      `SELECT q.title AS quiz_title, qa.score, qa.total_points, qa.percentage,
              qa.passed, qa.attempt_number, qa.submitted_at
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.student_id = $1 AND q.course_id = $2
       ORDER BY qa.submitted_at DESC`,
      [studentId, course_id]
    ),

    query(
      `SELECT a.title AS assignment_title, sub.submission_text, sub.file_url,
              sub.grade, a.max_grade, sub.feedback, sub.submitted_at, sub.graded_at
       FROM assignment_submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       WHERE sub.student_id = $1 AND a.course_id = $2`,
      [studentId, course_id]
    )
  ]);

  if (!student.rows.length) throw createError('Student not found.', 404);

  const totalLessons = lessonProgress.rows.length;
  const completedLessons = lessonProgress.rows.filter(l => l.is_completed).length;

  res.json({
    success: true,
    data: {
      student: student.rows[0],
      summary: {
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        progress_pct: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
      },
      lesson_progress: lessonProgress.rows,
      quiz_results: quizResults.rows,
      assignment_submissions: submissions.rows
    }
  });
});

module.exports = { getDashboard, getCourseStudents, getCourseAnalytics, getStudentDetailProgress };
