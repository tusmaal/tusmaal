-- ============================================================
-- USER APPROVAL / SUBSCRIBER GATING
-- New public sign-ups become "subscribers" (receive newsletters
-- & announcements) but cannot access the dashboard until an admin
-- approves them — which happens automatically when a course is granted.
-- Existing users default to TRUE so nothing breaks.
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- Make sure every current account stays approved.
UPDATE users SET is_approved = TRUE WHERE is_approved IS NULL;
