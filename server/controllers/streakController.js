const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { scaActive } = require('../utils/courseAccess');
const { toDateStr } = require('../utils/streak');

// GET /api/me/streak — current streak, today's goal progress, last 7 days, and the
// "certificate carrot": the course the student is closest to finishing.
const getStreak = asyncHandler(async (req, res) => {
  const studentId = req.user.id;

  const streakRes = await query('SELECT * FROM learning_streaks WHERE student_id = $1', [studentId]);
  let streak = streakRes.rows[0];
  if (!streak) {
    streak = { current_streak: 0, longest_streak: 0, daily_goal_lessons: 1, last_active_date: null, total_active_days: 0 };
  }

  // Today's progress vs goal
  const today = await query(
    `SELECT lessons_completed, goal_met FROM daily_activity
     WHERE student_id = $1 AND activity_date = CURRENT_DATE`,
    [studentId]
  );
  const todayLessons = Number(today.rows[0]?.lessons_completed || 0);

  // Is the streak still "alive" today? (active today or yesterday)
  const last = streak.last_active_date ? toDateStr(streak.last_active_date) : null;
  const todayStr = toDateStr(new Date());
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const alive = last === todayStr || last === toDateStr(yesterday);

  // Last 7 days for a mini calendar
  const week = await query(
    `SELECT activity_date, lessons_completed, goal_met
     FROM daily_activity
     WHERE student_id = $1 AND activity_date > CURRENT_DATE - INTERVAL '7 days'
     ORDER BY activity_date`,
    [studentId]
  );

  // Certificate carrot — closest in-progress course to completion (not yet certified)
  const carrot = await query(
    `SELECT c.id, c.title, c.slug,
            COUNT(DISTINCT l.id) AS total_lessons,
            COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE) AS completed_lessons
     FROM student_course_access sca
     JOIN courses c ON sca.course_id = c.id
     LEFT JOIN lessons l ON l.course_id = c.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
     LEFT JOIN certificates cert ON cert.course_id = c.id AND cert.student_id = $1
     WHERE sca.student_id = $1 AND ${scaActive('sca')} AND cert.id IS NULL
     GROUP BY c.id, c.title, c.slug
     HAVING COUNT(DISTINCT l.id) > 0
        AND COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE) > 0
        AND COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE) < COUNT(DISTINCT l.id)
     ORDER BY (COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = TRUE)::float
               / NULLIF(COUNT(DISTINCT l.id),0)) DESC
     LIMIT 1`,
    [studentId]
  );

  let certificateCarrot = null;
  if (carrot.rows.length) {
    const r = carrot.rows[0];
    const total = Number(r.total_lessons);
    const done = Number(r.completed_lessons);
    certificateCarrot = {
      course_id: r.id, slug: r.slug, title: r.title,
      total_lessons: total, completed_lessons: done,
      remaining: total - done,
      progress_pct: Math.round((done / total) * 100),
    };
  }

  res.json({
    success: true,
    data: {
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      streak_alive: alive,
      daily_goal_lessons: streak.daily_goal_lessons,
      today_lessons: todayLessons,
      goal_met_today: todayLessons >= streak.daily_goal_lessons,
      week: week.rows,
      certificate_carrot: certificateCarrot,
    },
  });
});

// PUT /api/me/streak/goal  body: { daily_goal_lessons }
const setGoal = asyncHandler(async (req, res) => {
  const goal = Math.max(1, Math.min(20, Number(req.body.daily_goal_lessons) || 1));
  await query(
    `INSERT INTO learning_streaks (student_id, daily_goal_lessons, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (student_id) DO UPDATE SET daily_goal_lessons = $2, updated_at = NOW()`,
    [req.user.id, goal]
  );
  res.json({ success: true, data: { daily_goal_lessons: goal } });
});

module.exports = { getStreak, setGoal };
