const { query, getClient } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { COMPLETION_MIN_WATCH_PCT, getLessonCompletionGate } = require('../utils/lessonProgress');
const { recordLessonActivity, grantLoyaltyReward, logEvent } = require('../services/growthService');
const { issueCourseCertificate } = require('../services/certificateService');
const { scaActive, scaActivePlain } = require('../utils/courseAccess');

// GET /api/progress/course/:courseId
// Full progress snapshot for the authenticated student
const getCourseProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.id;

  // Verify access
  const access = await query(
    `SELECT id FROM student_course_access WHERE student_id = $1 AND course_id = $2 AND ${scaActivePlain()}`,
    [studentId, courseId]
  );
  if (!access.rows.length) throw createError('Access denied to this course.', 403);

  const [courseInfo, sections, quizResults, assignmentResults, certificate] = await Promise.all([
    query(
      `SELECT c.id, c.title, c.duration_hours,
              COUNT(DISTINCT l.id) AS total_lessons
       FROM courses c
       LEFT JOIN lessons l ON l.course_id = c.id
       WHERE c.id = $1 GROUP BY c.id`,
      [courseId]
    ),

    query(
      `SELECT s.id AS section_id, s.title AS section_title, s.order_index,
              l.id AS lesson_id, l.title AS lesson_title, l.content_type,
              l.duration_minutes, l.order_index AS lesson_order,
              l.is_mandatory,
              COALESCE(lp.is_completed, FALSE) AS is_completed,
              lp.completed_at, lp.watch_time_seconds
       FROM sections s
       JOIN lessons l ON l.section_id = s.id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
       WHERE s.course_id = $2
       ORDER BY s.order_index, l.order_index`,
      [studentId, courseId]
    ),

    query(
      `SELECT q.id AS quiz_id, q.title, qa.percentage, qa.passed,
              qa.attempt_number, qa.submitted_at
       FROM quizzes q
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = $1
         AND qa.attempt_number = (
           SELECT MAX(attempt_number) FROM quiz_attempts
           WHERE quiz_id = q.id AND student_id = $1
         )
       WHERE q.course_id = $2`,
      [studentId, courseId]
    ),

    query(
      `SELECT a.id AS assignment_id, a.title, a.max_grade,
              sub.grade, sub.submitted_at, sub.graded_at
       FROM assignments a
       LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = $1
       WHERE a.course_id = $2`,
      [studentId, courseId]
    ),

    query(
      `SELECT certificate_number, issued_at FROM certificates
       WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId]
    )
  ]);

  // Build section tree with lesson progress
  const sectionMap = {};
  for (const row of sections.rows) {
    if (!sectionMap[row.section_id]) {
      sectionMap[row.section_id] = {
        id: row.section_id, title: row.section_title,
        order_index: row.order_index, lessons: []
      };
    }
    sectionMap[row.section_id].lessons.push({
      id: row.lesson_id, title: row.lesson_title,
      content_type: row.content_type, duration_minutes: row.duration_minutes,
      order_index: row.lesson_order, is_mandatory: row.is_mandatory,
      is_completed: row.is_completed, completed_at: row.completed_at,
      watch_time_seconds: row.watch_time_seconds
    });
  }

  const totalLessons = sections.rows.length;
  const completedLessons = sections.rows.filter(r => r.is_completed).length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Total watch time
  const totalWatchSecs = sections.rows.reduce((acc, r) => acc + (r.watch_time_seconds || 0), 0);

  res.json({
    success: true,
    data: {
      course: courseInfo.rows[0],
      progress: {
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        progress_pct: progressPct,
        total_watch_time_minutes: Math.round(totalWatchSecs / 60),
        is_complete: progressPct === 100,
        certificate: certificate.rows[0] || null
      },
      sections: Object.values(sectionMap),
      quizzes: quizResults.rows,
      assignments: assignmentResults.rows
    }
  });
});

// POST /api/progress/lesson/:lessonId/track
// Track watch progress (called periodically while watching a video)
const trackLessonProgress = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { watch_time_seconds, is_completed, duration_seconds } = req.body;
  const studentId = req.user.id;

  const lesson = await query(
    'SELECT course_id, duration_minutes, mux_duration_seconds, content_type FROM lessons WHERE id = $1',
    [lessonId]
  );
  if (!lesson.rows.length) throw createError('Lesson not found.', 404);
  const lessonRow = lesson.rows[0];
  const courseId = lessonRow.course_id;

  // Check student access
  const access = await query(
    `SELECT id FROM student_course_access WHERE student_id = $1 AND course_id = $2 AND ${scaActivePlain()}`,
    [studentId, courseId]
  );
  if (!access.rows.length) throw createError('Access denied.', 403);

  const currentProgress = await query(
    'SELECT watch_time_seconds FROM lesson_progress WHERE student_id = $1 AND lesson_id = $2',
    [studentId, lessonId]
  );
  const prevWatch = Number(currentProgress.rows[0]?.watch_time_seconds || 0);
  const nextWatch = Math.max(prevWatch, Number(watch_time_seconds || 0));
  const { requiredWatchSeconds } = getLessonCompletionGate(lessonRow, duration_seconds);

  if (is_completed && nextWatch < requiredWatchSeconds) {
    throw createError(
      `You must watch at least ${COMPLETION_MIN_WATCH_PCT}% of this lesson before marking it complete.`,
      400
    );
  }

  // Upsert progress row
  const result = await query(
    `INSERT INTO lesson_progress (student_id, lesson_id, course_id, watch_time_seconds, is_completed, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (student_id, lesson_id) DO UPDATE SET
       watch_time_seconds = GREATEST(lesson_progress.watch_time_seconds, $4),
       is_completed = CASE WHEN $5 = TRUE THEN TRUE ELSE lesson_progress.is_completed END,
       completed_at = CASE WHEN $5 = TRUE AND lesson_progress.completed_at IS NULL THEN NOW()
                          ELSE lesson_progress.completed_at END,
       updated_at = NOW()
     RETURNING *`,
    [studentId, lessonId, courseId, nextWatch, is_completed || false,
     is_completed ? new Date() : null]
  );

  // Check if course is now 100% complete
  let certificateData = null;
  if (is_completed) {
    const progressCheck = await query(
      `SELECT COUNT(l.id) AS total,
              COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE) AS done
       FROM lessons l
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
       WHERE l.course_id = $2`,
      [studentId, courseId]
    );
    const { total, done } = progressCheck.rows[0];

    if (parseInt(done) >= parseInt(total) && parseInt(total) > 0) {
      // Auto-issue certificate
      const existing = await query(
        'SELECT id FROM certificates WHERE student_id = $1 AND course_id = $2',
        [studentId, courseId]
      );

      if (!existing.rows.length) {
        certificateData = await issueCourseCertificate({ studentId, courseId });
      }
    }
  }

  // Growth hooks (fire-and-forget — never block or fail the response).
  if (is_completed) {
    recordLessonActivity(studentId).catch(() => {});
    logEvent({ userId: studentId, type: 'lesson_complete', courseId, lessonId }).catch(() => {});
  }
  if (certificateData) {
    logEvent({ userId: studentId, type: 'course_complete', courseId }).catch(() => {});
    const titleRow = await query('SELECT title FROM courses WHERE id = $1', [courseId]).catch(() => null);
    const courseTitle = titleRow?.rows?.[0]?.title || 'your course';
    grantLoyaltyReward(studentId, courseTitle).catch(() => {});
  }

  res.json({
    success: true,
    data: {
      progress: result.rows[0],
      certificate_issued: !!certificateData,
      certificate: certificateData,
    }
  });
});

// GET /api/progress/summary  — all courses progress for student
const getProgressSummary = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.id, c.title, c.thumbnail, c.slug,
            COUNT(DISTINCT l.id) AS total_lessons,
            COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE) AS completed_lessons,
            ROUND(
              COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE) * 100.0
              / NULLIF(COUNT(DISTINCT l.id), 0), 1
            ) AS progress_pct,
            MAX(lp.updated_at) AS last_activity,
            cert.issued_at AS certificate_issued_at,
            cert.certificate_number
     FROM student_course_access sca
     JOIN courses c ON sca.course_id = c.id
     LEFT JOIN lessons l ON l.course_id = c.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
     LEFT JOIN certificates cert ON cert.course_id = c.id AND cert.student_id = $1
     WHERE sca.student_id = $1 AND ${scaActive('sca')}
     GROUP BY c.id, c.title, c.thumbnail, c.slug, cert.issued_at, cert.certificate_number
     ORDER BY last_activity DESC NULLS LAST`,
    [req.user.id]
  );

  res.json({ success: true, data: result.rows });
});

module.exports = { getCourseProgress, trackLessonProgress, getProgressSummary };
