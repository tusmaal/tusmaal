const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { logEvent } = require('../services/growthService');
const { scaActivePlain } = require('../utils/courseAccess');

// POST /api/track  (public, optional auth) body: { type, course_id?, lesson_id?, session_id?, metadata? }
// Lightweight client-side funnel ping (catalog_view, course_view, etc.).
const track = asyncHandler(async (req, res) => {
  const { type, course_id, lesson_id, session_id, metadata } = req.body;
  const ALLOWED = ['catalog_view', 'course_view', 'enroll_start', 'lesson_start', 'lesson_complete'];
  if (!type || !ALLOWED.includes(type)) {
    // Silently accept to avoid breaking the client; just don't log unknown types.
    return res.json({ success: true });
  }
  await logEvent({
    userId: req.user?.id || null,
    sessionId: session_id || null,
    type,
    courseId: course_id || null,
    lessonId: lesson_id || null,
    metadata: metadata || null,
  });
  res.json({ success: true });
});

// GET /api/admin/funnel/overview?days=30
// Catalog view → course view → enroll → first lesson → course complete.
const overview = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const interval = `${days} days`;

  const events = await query(
    `SELECT event_type, COUNT(*) AS n, COUNT(DISTINCT COALESCE(user_id::text, session_id)) AS people
     FROM funnel_events
     WHERE created_at > NOW() - $1::interval
     GROUP BY event_type`,
    [interval]
  );
  const byType = {};
  events.rows.forEach(r => { byType[r.event_type] = { events: Number(r.n), people: Number(r.people) }; });

  // Enrollments + completions from the source of truth (access + certificates).
  const enrollments = await query(
    `SELECT COUNT(*) FROM student_course_access WHERE granted_at > NOW() - $1::interval`,
    [interval]
  );
  const completions = await query(
    `SELECT COUNT(*) FROM certificates WHERE issued_at > NOW() - $1::interval`,
    [interval]
  );

  const catalogViews = byType.catalog_view?.events || 0;
  const courseViews = byType.course_view?.events || 0;
  const enrolled = Number(enrollments.rows[0].count);
  const completed = Number(completions.rows[0].count);

  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

  res.json({
    success: true,
    data: {
      window_days: days,
      stages: [
        { key: 'catalog_view', label: 'Catalog views', value: catalogViews },
        { key: 'course_view', label: 'Course page views', value: courseViews, rate_from_prev: pct(courseViews, catalogViews) },
        { key: 'enroll', label: 'Enrollments', value: enrolled, rate_from_prev: pct(enrolled, courseViews) },
        { key: 'complete', label: 'Course completions', value: completed, rate_from_prev: pct(completed, enrolled) },
      ],
      raw_events: byType,
    },
  });
});

// GET /api/admin/funnel/course/:courseId/dropoff
// Per-lesson completion to reveal where students quit a course.
const lessonDropoff = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const enrolled = await query(
    `SELECT COUNT(*) FROM student_course_access WHERE course_id = $1 AND ${scaActivePlain()}`,
    [courseId]
  );
  const totalStudents = Number(enrolled.rows[0].count) || 0;

  const lessons = await query(
    `SELECT l.id, l.title, s.title AS section_title, s.order_index AS sec_order, l.order_index AS lesson_order,
            COUNT(lp.id) FILTER (WHERE lp.is_completed = TRUE) AS completed
     FROM lessons l
     JOIN sections s ON l.section_id = s.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id
     WHERE l.course_id = $1
     GROUP BY l.id, l.title, s.title, s.order_index, l.order_index
     ORDER BY s.order_index, l.order_index`,
    [courseId]
  );

  let prev = totalStudents;
  const rows = lessons.rows.map(r => {
    const completed = Number(r.completed);
    const dropFromPrev = prev > 0 ? Math.round(((prev - completed) / prev) * 1000) / 10 : 0;
    const reachRate = totalStudents > 0 ? Math.round((completed / totalStudents) * 1000) / 10 : 0;
    prev = completed;
    return {
      lesson_id: r.id, lesson: r.title, section: r.section_title,
      completed, completion_rate: reachRate, drop_from_previous: Math.max(0, dropFromPrev),
    };
  });

  res.json({ success: true, data: { total_students: totalStudents, lessons: rows } });
});

module.exports = { track, overview, lessonDropoff };
