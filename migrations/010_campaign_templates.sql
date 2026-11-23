-- ============================================================
-- 010  CAMPAIGN TEMPLATES
-- Distinct email designs per campaign type, plus the ability to
-- feature/discount a specific course inside the email content.
-- (feature_course_id is the course shown in the email body — kept
--  separate from course_id which is used for audience targeting.)
-- Additive & idempotent.
-- ============================================================
ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS campaign_type     VARCHAR(30) NOT NULL DEFAULT 'newsletter',
  ADD COLUMN IF NOT EXISTS feature_course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
