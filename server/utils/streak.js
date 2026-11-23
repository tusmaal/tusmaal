// Pure streak + drip helpers — no DB, no side effects. Unit-tested in /test.

// Returns YYYY-MM-DD for a date (UTC-safe enough for daily streaks).
function toDateStr(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const ms = new Date(toDateStr(b)) - new Date(toDateStr(a));
  return Math.round(ms / 86400000);
}

// Given the previous streak row and "today", compute the new streak.
// prev: { current_streak, longest_streak, last_active_date, total_active_days }
// Returns the updated values. Activity on the same day is a no-op for the count.
function computeStreak(prev, today = new Date()) {
  const todayStr = toDateStr(today);
  const last = prev?.last_active_date ? toDateStr(prev.last_active_date) : null;
  let current = Number(prev?.current_streak || 0);
  let longest = Number(prev?.longest_streak || 0);
  let totalDays = Number(prev?.total_active_days || 0);

  if (last === todayStr) {
    return { current_streak: current, longest_streak: longest, last_active_date: todayStr, total_active_days: totalDays, changed: false };
  }

  const gap = last ? daysBetween(last, todayStr) : null;
  if (gap === 1) current = current + 1;        // consecutive day
  else current = 1;                            // first day or streak broken

  totalDays = totalDays + 1;
  longest = Math.max(longest, current);
  return { current_streak: current, longest_streak: longest, last_active_date: todayStr, total_active_days: totalDays, changed: true };
}

// Whether a section is unlocked for a student.
// baseDate = cohort.start_date (cohort drip) or student first-access date (self-paced).
// offsetDays = section.drip_offset_days. now defaults to today.
function isSectionReleased(baseDate, offsetDays, now = new Date()) {
  if (!offsetDays || Number(offsetDays) <= 0) return true;
  if (!baseDate) return true; // no schedule anchor => available
  const release = new Date(toDateStr(baseDate));
  release.setDate(release.getDate() + Number(offsetDays));
  return new Date(toDateStr(now)) >= release;
}

// Days until a locked section unlocks (0 if already released).
function daysUntilRelease(baseDate, offsetDays, now = new Date()) {
  if (isSectionReleased(baseDate, offsetDays, now)) return 0;
  const release = new Date(toDateStr(baseDate));
  release.setDate(release.getDate() + Number(offsetDays));
  return Math.max(0, daysBetween(now, release));
}

module.exports = { toDateStr, daysBetween, computeStreak, isSectionReleased, daysUntilRelease };
