const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { computeStreak } = require('../utils/streak');

// ─── FUNNEL ───────────────────────────────────────────────────────────────
// Fire-and-forget event logging. Never throws into the request path.
const logEvent = async ({ userId = null, sessionId = null, type, courseId = null, lessonId = null, metadata = null }) => {
  try {
    await query(
      `INSERT INTO funnel_events (id, user_id, session_id, event_type, course_id, lesson_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), userId, sessionId, type, courseId, lessonId, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error('Funnel log error:', err.message);
  }
};

// ─── STREAKS + DAILY GOAL ──────────────────────────────────────────────────
// Call whenever a student completes a lesson. Updates streak + daily_activity.
const recordLessonActivity = async (studentId) => {
  try {
    const prevRes = await query('SELECT * FROM learning_streaks WHERE student_id = $1', [studentId]);
    const prev = prevRes.rows[0] || null;
    const next = computeStreak(prev, new Date());

    await query(
      `INSERT INTO learning_streaks
         (student_id, current_streak, longest_streak, last_active_date, total_active_days, daily_goal_lessons, updated_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 1), NOW())
       ON CONFLICT (student_id) DO UPDATE SET
         current_streak   = $2,
         longest_streak   = $3,
         last_active_date = $4,
         total_active_days = $5,
         updated_at       = NOW()`,
      [studentId, next.current_streak, next.longest_streak, next.last_active_date,
       next.total_active_days, prev?.daily_goal_lessons || 1]
    );

    const goal = prev?.daily_goal_lessons || 1;
    await query(
      `INSERT INTO daily_activity (id, student_id, activity_date, lessons_completed, goal_met)
       VALUES ($1, $2, CURRENT_DATE, 1, (1 >= $3))
       ON CONFLICT (student_id, activity_date) DO UPDATE SET
         lessons_completed = daily_activity.lessons_completed + 1,
         goal_met = (daily_activity.lessons_completed + 1 >= $3)`,
      [uuidv4(), studentId, goal]
    );
    return next;
  } catch (err) {
    console.error('Streak record error:', err.message);
    return null;
  }
};

// ─── PERSONAL COUPON GENERATION (loyalty + referral rewards) ───────────────
const makeCode = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const issuePersonalCoupon = async ({ userId, source, percent = 10, days = 60, description }) => {
  try {
    const code = makeCode(source === 'referral' ? 'REF' : 'LOYAL');
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    const res = await query(
      `INSERT INTO coupons
         (id, code, description, discount_type, discount_value, applies_to,
          max_uses, per_user_limit, assigned_to_user, auto_source, expires_at, is_active)
       VALUES ($1, $2, $3, 'percent', $4, 'all', 1, 1, $5, $6, $7, TRUE)
       RETURNING *`,
      [uuidv4(), code, description || `${percent}% reward`, percent, userId, source, expires]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Personal coupon error:', err.message);
    return null;
  }
};

// Called when a student completes a course → reward them for the next one.
const grantLoyaltyReward = async (studentId, courseTitle) => {
  return issuePersonalCoupon({
    userId: studentId,
    source: 'loyalty',
    percent: 10,
    days: 90,
    description: `10% off your next course — for completing "${courseTitle}".`,
  });
};

// Called when a referred student first gets course access (qualifies the referral).
const qualifyReferral = async (referredUserId) => {
  try {
    const refRes = await query(
      `SELECT * FROM referrals WHERE referred_user_id = $1 AND status = 'pending'`,
      [referredUserId]
    );
    if (!refRes.rows.length) return null;
    const referral = refRes.rows[0];

    const coupon = await issuePersonalCoupon({
      userId: referral.referrer_id,
      source: 'referral',
      percent: 15,
      days: 90,
      description: '15% off — thanks for referring a friend!',
    });

    await query(
      `UPDATE referrals SET status = 'rewarded', reward_coupon_id = $2, qualified_at = NOW()
       WHERE id = $1`,
      [referral.id, coupon?.id || null]
    );
    return { referral, coupon };
  } catch (err) {
    console.error('Referral qualify error:', err.message);
    return null;
  }
};

module.exports = {
  logEvent,
  recordLessonActivity,
  issuePersonalCoupon,
  grantLoyaltyReward,
  qualifyReferral,
};
