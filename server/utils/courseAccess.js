/** Course access duration from grant date (months). */
const COURSE_ACCESS_MONTHS = 6;

/** SQL interval for INSERT/UPDATE on grant. */
const EXPIRES_INTERVAL_SQL = `INTERVAL '${COURSE_ACCESS_MONTHS} months'`;

/** Active, non-expired access — use with table alias (default sca). */
const scaActive = (alias = 'sca') =>
  `${alias}.is_active = TRUE AND ${alias}.expires_at > NOW()`;

/** Active, non-expired — no alias (student_course_access only). */
const scaActivePlain = () => `is_active = TRUE AND expires_at > NOW()`;

module.exports = {
  COURSE_ACCESS_MONTHS,
  EXPIRES_INTERVAL_SQL,
  scaActive,
  scaActivePlain,
};
