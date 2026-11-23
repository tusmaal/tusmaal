const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeStreak, isSectionReleased, daysUntilRelease, daysBetween } = require('../server/utils/streak');

test('first activity starts a 1-day streak', () => {
  const next = computeStreak(null, new Date('2026-01-10'));
  assert.equal(next.current_streak, 1);
  assert.equal(next.longest_streak, 1);
  assert.equal(next.changed, true);
});

test('consecutive day increments streak', () => {
  const prev = { current_streak: 3, longest_streak: 3, last_active_date: '2026-01-09', total_active_days: 3 };
  const next = computeStreak(prev, new Date('2026-01-10'));
  assert.equal(next.current_streak, 4);
  assert.equal(next.longest_streak, 4);
});

test('same-day activity does not change streak', () => {
  const prev = { current_streak: 4, longest_streak: 4, last_active_date: '2026-01-10', total_active_days: 4 };
  const next = computeStreak(prev, new Date('2026-01-10'));
  assert.equal(next.current_streak, 4);
  assert.equal(next.changed, false);
});

test('a gap resets the streak but keeps the longest', () => {
  const prev = { current_streak: 5, longest_streak: 5, last_active_date: '2026-01-05', total_active_days: 5 };
  const next = computeStreak(prev, new Date('2026-01-10'));
  assert.equal(next.current_streak, 1);
  assert.equal(next.longest_streak, 5);
});

test('section with zero offset is always released', () => {
  assert.equal(isSectionReleased('2026-01-01', 0, new Date('2026-01-01')), true);
});

test('section drip locks until the offset has passed', () => {
  assert.equal(isSectionReleased('2026-01-01', 7, new Date('2026-01-05')), false);
  assert.equal(isSectionReleased('2026-01-01', 7, new Date('2026-01-08')), true);
});

test('daysUntilRelease counts down correctly', () => {
  assert.equal(daysUntilRelease('2026-01-01', 7, new Date('2026-01-04')), 4);
  assert.equal(daysUntilRelease('2026-01-01', 7, new Date('2026-01-09')), 0);
});

test('daysBetween computes whole days', () => {
  assert.equal(daysBetween('2026-01-01', '2026-01-04'), 3);
});
