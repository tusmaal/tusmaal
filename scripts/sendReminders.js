// scripts/sendReminders.js
// Sends a re-engagement email to students who:
//   - have at least one active course,
//   - last completed a lesson 3 or more days ago (or never, but enrolled 3+ days ago),
//   - and have NOT already been reminded today.
//
// Run on a schedule, e.g. once a day:
//   node scripts/sendReminders.js
// crontab:   0 9 * * *  cd /path/to/backend && node scripts/sendReminders.js
//
// Honors SMTP config in .env — if SMTP is not set, emails are logged and skipped
// (emailService handles that), so this is always safe to run.

require('../server/loadEnv');
const { pool, query } = require('../server/config/database');
const { sendStreakReminder } = require('../server/services/emailService');
const { scaActive } = require('../server/utils/courseAccess');

const INACTIVE_DAYS = Number(process.env.REMINDER_INACTIVE_DAYS || 3);

async function run() {
  console.log(`\n📨 Reminder run — inactivity threshold: ${INACTIVE_DAYS} days\n`);

  // Find candidate students: enrolled, but no lesson completed in the last N days.
  const candidates = await query(
    `SELECT u.id, u.full_name, u.email,
            ls.current_streak,
            MAX(c.title) AS a_course_title,
            MAX(lp.updated_at) AS last_activity
     FROM users u
     JOIN student_course_access sca ON sca.student_id = u.id AND ${scaActive('sca')}
     JOIN courses c ON sca.course_id = c.id
     LEFT JOIN lesson_progress lp ON lp.student_id = u.id
     LEFT JOIN learning_streaks ls ON ls.student_id = u.id
     WHERE u.role = 'student' AND u.is_active = TRUE
     GROUP BY u.id, u.full_name, u.email, ls.current_streak
     HAVING MAX(lp.updated_at) IS NULL
         OR MAX(lp.updated_at) < NOW() - ($1 || ' days')::interval`,
    [INACTIVE_DAYS]
  );

  let sent = 0;
  for (const s of candidates.rows) {
    const daysInactive = s.last_activity
      ? Math.floor((Date.now() - new Date(s.last_activity)) / 86400000)
      : INACTIVE_DAYS;

    await sendStreakReminder({
      email: s.email,
      fullName: s.full_name,
      daysInactive,
      currentStreak: Number(s.current_streak || 0),
      courseName: s.a_course_title,
    });
    sent++;
  }

  console.log(`\n✅ Reminder run complete. ${sent} student(s) processed.\n`);
  return sent;
}

if (require.main === module) {
  run()
    .catch(err => { console.error('❌ Reminder run failed:', err.message); process.exitCode = 1; })
    .finally(async () => { await pool.end(); });
}

module.exports = { run };
