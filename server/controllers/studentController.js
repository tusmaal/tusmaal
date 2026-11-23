const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { isSectionReleased, daysUntilRelease, toDateStr } = require('../utils/streak');
const { getLessonCompletionGate, COMPLETION_MIN_WATCH_PCT } = require('../utils/lessonProgress');
const { issueCourseCertificate } = require('../services/certificateService');
const { scaActive, scaActivePlain } = require('../utils/courseAccess');

// GET /api/student/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const studentId = req.user.id;

  const [courses, recentProgress, certificates] = await Promise.all([
    query(
      `SELECT c.id, c.title, c.slug, c.thumbnail, c.total_students,
              u.full_name AS teacher_name,
              COUNT(l.id) AS total_lessons,
              COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE) AS completed_lessons
       FROM student_course_access sca
       JOIN courses c ON sca.course_id = c.id
       LEFT JOIN users u ON c.teacher_id = u.id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
       WHERE sca.student_id = $1 AND ${scaActive('sca')}
       GROUP BY c.id, c.title, c.slug, c.thumbnail, c.total_students, u.full_name`,
      [studentId]
    ),
    query(
      `SELECT l.title AS lesson_title, c.title AS course_title, lp.updated_at
       FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       JOIN courses c ON lp.course_id = c.id
       WHERE lp.student_id = $1 ORDER BY lp.updated_at DESC LIMIT 5`,
      [studentId]
    ),
    query('SELECT COUNT(*) FROM certificates WHERE student_id = $1', [studentId])
  ]);

  res.json({
    success: true,
    data: {
      enrolled_courses: courses.rows.length,
      certificates_earned: parseInt(certificates.rows[0].count),
      courses: courses.rows,
      recent_activity: recentProgress.rows
    }
  });
});

// GET /api/student/courses — all accessible courses
const getMyCourses = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.id, c.title, c.slug, c.thumbnail, c.language, c.level,
            u.full_name AS teacher_name,
            sca.expires_at,
            COUNT(DISTINCT l.id) AS total_lessons,
            COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE) AS completed_lessons,
            ROUND(COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE) * 100.0
              / NULLIF(COUNT(DISTINCT l.id), 0), 1) AS progress_pct
     FROM student_course_access sca
     JOIN courses c ON sca.course_id = c.id
     LEFT JOIN users u ON c.teacher_id = u.id
     LEFT JOIN lessons l ON l.course_id = c.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
     WHERE sca.student_id = $1 AND ${scaActive('sca')}
     GROUP BY c.id, c.title, c.slug, c.thumbnail, c.language, c.level, u.full_name, sca.expires_at`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

// GET /api/student/courses/:courseId — course content (only if access granted)
const getCourseContent = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.id;

  // Check access
  const access = await query(
    `SELECT id, granted_at, expires_at FROM student_course_access
     WHERE student_id = $1 AND course_id = $2 AND ${scaActivePlain()}`,
    [studentId, courseId]
  );
  if (!access.rows.length) {
    const expired = await query(
      `SELECT expires_at FROM student_course_access
       WHERE student_id = $1 AND course_id = $2 AND is_active = TRUE AND expires_at <= NOW()`,
      [studentId, courseId]
    );
    if (expired.rows.length) {
      throw createError('Your access to this course has expired. Contact us on WhatsApp to renew.', 403);
    }
    throw createError('You do not have access to this course. Please contact the admin.', 403);
  }

  const course = await query(
    `SELECT c.id, c.title, c.description, c.language, c.level, c.duration_hours,
            u.full_name AS teacher_name, u.profile_photo AS teacher_photo, u.bio AS teacher_bio
     FROM courses c LEFT JOIN users u ON c.teacher_id = u.id WHERE c.id = $1`,
    [courseId]
  );
  if (!course.rows.length) throw createError('Course not found.', 404);

  // Drip anchor: cohort start date (if enrolled in a drip-enabled cohort), else first-access date.
  const cohort = await query(
    `SELECT ch.start_date FROM cohort_enrollments ce
     JOIN cohorts ch ON ce.cohort_id = ch.id
     WHERE ce.student_id = $1 AND ch.course_id = $2 AND ch.drip_enabled = TRUE
     ORDER BY ch.start_date ASC LIMIT 1`,
    [studentId, courseId]
  );
  const dripBase = cohort.rows[0]?.start_date || access.rows[0].granted_at || null;

  // Get sections + lessons WITH student progress
  const sections = await query(
    `SELECT s.id, s.title, s.order_index, s.drip_offset_days,
            json_agg(
              json_build_object(
                'id', l.id, 'title', l.title, 'content_type', l.content_type,
                'duration_minutes', l.duration_minutes, 'order_index', l.order_index,
                'video_url', l.video_url, 'youtube_url', l.youtube_url,
                'mux_playback_id', l.mux_playback_id, 'mux_status', l.mux_status,
                'mux_duration_seconds', l.mux_duration_seconds,
                'pdf_url', l.pdf_url, 'text_content', l.text_content,
                'is_completed', COALESCE(lp.is_completed, FALSE),
                'completed_at', lp.completed_at,
                'watch_time_seconds', COALESCE(lp.watch_time_seconds, 0)
              ) ORDER BY l.order_index
            ) FILTER (WHERE l.id IS NOT NULL) AS lessons
     FROM sections s
     LEFT JOIN lessons l ON l.section_id = s.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $2
     WHERE s.course_id = $1
     GROUP BY s.id ORDER BY s.order_index`,
    [courseId, studentId]
  );

  // Apply drip gating — locked sections keep their title but hide lesson content.
  const gatedSections = sections.rows.map(sec => {
    const released = isSectionReleased(dripBase, sec.drip_offset_days);
    if (released) return { ...sec, locked: false };
    const unlocksInDays = daysUntilRelease(dripBase, sec.drip_offset_days);
    const unlockDate = new Date(toDateStr(dripBase));
    unlockDate.setDate(unlockDate.getDate() + Number(sec.drip_offset_days));
    return {
      ...sec,
      locked: true,
      unlocks_in_days: unlocksInDays,
      unlock_date: toDateStr(unlockDate),
      lessons: (sec.lessons || []).map(l => ({
        id: l.id, title: l.title, content_type: l.content_type,
        duration_minutes: l.duration_minutes, order_index: l.order_index,
        mux_duration_seconds: l.mux_duration_seconds,
        is_completed: false, locked: true,
      })),
    };
  });

  const data = {
    ...course.rows[0],
    sections: gatedSections
  };

  res.json({ success: true, data });
});

// POST /api/student/lessons/:lessonId/complete — mark lesson complete
const completeLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { watch_time_seconds, duration_seconds } = req.body;
  const studentId = req.user.id;

  // Get course_id for this lesson
  const lesson = await query(
    'SELECT course_id, duration_minutes, mux_duration_seconds, content_type FROM lessons WHERE id = $1',
    [lessonId]
  );
  if (!lesson.rows.length) throw createError('Lesson not found.', 404);
  const lessonRow = lesson.rows[0];
  const courseId = lessonRow.course_id;

  // Verify student has access
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

  if (nextWatch < requiredWatchSeconds) {
    throw createError(
      `You must watch at least ${COMPLETION_MIN_WATCH_PCT}% of this lesson before marking it complete.`,
      400
    );
  }

  const result = await query(
    `INSERT INTO lesson_progress (student_id, lesson_id, course_id, is_completed, watch_time_seconds, completed_at)
     VALUES ($1, $2, $3, TRUE, $4, NOW())
     ON CONFLICT (student_id, lesson_id)
     DO UPDATE SET is_completed = TRUE, watch_time_seconds = $4, completed_at = NOW(), updated_at = NOW()
     RETURNING *`,
    [studentId, lessonId, courseId, nextWatch]
  );

  // Check if course is 100% complete → issue certificate
  const progress = await query(
    `SELECT COUNT(l.id) AS total, COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE) AS done
     FROM lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
     WHERE l.course_id = $2`,
    [studentId, courseId]
  );

  let certificate = null;
  const { total, done } = progress.rows[0];
  if (parseInt(total) > 0 && parseInt(done) >= parseInt(total)) {
    try {
      certificate = await issueCourseCertificate({ studentId, courseId });
    } catch (err) {
      const existing = await query(
        'SELECT * FROM certificates WHERE student_id = $1 AND course_id = $2',
        [studentId, courseId]
      );
      certificate = existing.rows[0] || null;
    }
  }

  res.json({
    success: true,
    message: 'Lesson completed.',
    data: { progress: result.rows[0], certificate, course_complete: !!certificate }
  });
});

// GET /api/student/certificates
const getCertificates = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT cert.id, cert.certificate_number, cert.issued_at,
            c.title AS course_title, c.thumbnail, u.full_name AS teacher_name
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE cert.student_id = $1
     ORDER BY cert.issued_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

// GET /api/student/announcements
const getAnnouncements = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT a.id, a.title, a.body, a.created_at, a.is_global,
            c.title AS course_title, u.full_name AS author
     FROM announcements a
     LEFT JOIN courses c ON a.course_id = c.id
     LEFT JOIN users u ON a.author_id = u.id
     WHERE a.is_global = TRUE
        OR a.course_id IN (
          SELECT course_id FROM student_course_access
          WHERE student_id = $1 AND ${scaActivePlain()}
        )
     ORDER BY a.created_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { getDashboard, getMyCourses, getCourseContent, completeLesson, getCertificates, getAnnouncements };
