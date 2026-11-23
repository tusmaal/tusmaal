-- ============================================================
-- 009  EMAIL BROADCAST / NEWSLETTER
-- Admin-only campaigns: newsletters, new-course announcements,
-- discount promos — sent to all or a segment of registered users.
-- Fully additive & idempotent.
-- ============================================================

-- ─── OPT-OUT + UNSUBSCRIBE TOKEN ON USERS ─────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_opt_out     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(64);

-- Backfill a random token for every existing user that lacks one.
UPDATE users
  SET unsubscribe_token = md5(random()::text || clock_timestamp()::text) || md5(random()::text || id::text)
  WHERE unsubscribe_token IS NULL;

-- New users automatically get a token (so register / admin-create need no changes).
ALTER TABLE users
  ALTER COLUMN unsubscribe_token
  SET DEFAULT md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text);

-- Enforce uniqueness (added after backfill to avoid collisions).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_unsubscribe_token_key') THEN
    ALTER TABLE users ADD CONSTRAINT users_unsubscribe_token_key UNIQUE (unsubscribe_token);
  END IF;
END$$;

-- ─── EMAIL CAMPAIGNS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaigns (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject          TEXT NOT NULL,
  body_html        TEXT NOT NULL,
  audience         VARCHAR(30) NOT NULL,   -- all_users | all_students | all_teachers | course_students | active_students | inactive_students
  course_id        UUID REFERENCES courses(id) ON DELETE SET NULL,
  coupon_id        UUID REFERENCES coupons(id) ON DELETE SET NULL,
  status           VARCHAR(12) NOT NULL DEFAULT 'draft',  -- draft | sending | sent | failed
  recipients_count INTEGER DEFAULT 0,
  sent_count       INTEGER DEFAULT 0,
  failed_count     INTEGER DEFAULT 0,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW(),
  sent_at          TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON email_campaigns(created_at DESC);
