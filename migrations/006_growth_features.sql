-- ============================================================
-- 006  GROWTH FEATURES
-- Coupons & bundles, all-access subscriptions, cohorts + drip,
-- live classes, referrals + account credits, funnel analytics,
-- streaks + daily goals, course FAQs, teacher Q&A / SLA.
-- Fully additive — nothing existing is dropped or changed.
-- ============================================================

-- ─── REFERRAL FIELDS ON USERS ─────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES users(id) ON DELETE SET NULL;

-- ─── COUPONS / PROMO CODES ────────────────────────────────────────────────
-- A coupon can apply to everything, one course, or one bundle.
-- assigned_to_user != NULL => personal coupon (loyalty / referral reward).
CREATE TABLE IF NOT EXISTS coupons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(40) UNIQUE NOT NULL,
  description      TEXT,
  discount_type    VARCHAR(10) NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value   DECIMAL(10,2) NOT NULL,
  applies_to       VARCHAR(10) NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','course','bundle')),
  course_id        UUID REFERENCES courses(id) ON DELETE CASCADE,
  bundle_id        UUID,
  min_purchase     DECIMAL(10,2) DEFAULT 0,
  max_uses         INTEGER,                 -- NULL = unlimited
  used_count       INTEGER NOT NULL DEFAULT 0,
  per_user_limit   INTEGER DEFAULT 1,
  assigned_to_user UUID REFERENCES users(id) ON DELETE CASCADE,
  auto_source      VARCHAR(20) DEFAULT 'manual' CHECK (auto_source IN ('manual','loyalty','referral')),
  starts_at        TIMESTAMP,
  expires_at       TIMESTAMP,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code   ON coupons(LOWER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_user   ON coupons(assigned_to_user);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id        UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id        UUID REFERENCES courses(id) ON DELETE SET NULL,
  bundle_id        UUID,
  original_amount  DECIMAL(10,2),
  discount_applied DECIMAL(10,2),
  final_amount     DECIMAL(10,2),
  redeemed_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user   ON coupon_redemptions(user_id);

-- ─── BUNDLES (buy several courses for one price) ──────────────────────────
CREATE TABLE IF NOT EXISTS bundles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(300) UNIQUE NOT NULL,
  description TEXT,
  thumbnail   VARCHAR(500),
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency    VARCHAR(10) DEFAULT 'USD',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bundle_courses (
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, course_id)
);

-- ─── ALL-ACCESS SUBSCRIPTION PLANS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency      VARCHAR(10) DEFAULT 'USD',
  interval      VARCHAR(12) NOT NULL DEFAULT 'monthly' CHECK (interval IN ('monthly','quarterly','yearly')),
  duration_days INTEGER NOT NULL DEFAULT 30,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id     UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status      VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  started_at  TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP NOT NULL,
  granted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active  ON subscriptions(student_id) WHERE status = 'active';

-- ─── COHORTS / BATCHES + DRIP ─────────────────────────────────────────────
-- Sections are released gradually using sections.drip_offset_days.
-- Cohort-based: release = cohort.start_date + offset days.
-- Self-paced  : release = student first-access date + offset days.
ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS drip_offset_days INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS cohorts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name              VARCHAR(160) NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  drip_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  capacity          INTEGER,            -- NULL = unlimited
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cohorts_course ON cohorts(course_id);

CREATE TABLE IF NOT EXISTS cohort_enrollments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id   UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (cohort_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_cohort_enroll_student ON cohort_enrollments(student_id);

-- ─── LIVE CLASS SESSIONS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  cohort_id        UUID REFERENCES cohorts(id) ON DELETE SET NULL,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  provider         VARCHAR(12) NOT NULL DEFAULT 'meet' CHECK (provider IN ('zoom','meet','jitsi','other')),
  meeting_url      VARCHAR(600) NOT NULL,
  scheduled_at     TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_time   ON live_sessions(scheduled_at);

-- ─── REFERRALS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rewarded')),
  reward_coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW(),
  qualified_at     TIMESTAMP,
  UNIQUE (referred_user_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- ─── ACCOUNT CREDITS (loyalty + referral wallet) ──────────────────────────
CREATE TABLE IF NOT EXISTS account_credits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      DECIMAL(10,2) NOT NULL,
  currency    VARCHAR(10) DEFAULT 'USD',
  reason      VARCHAR(255),
  source      VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual','loyalty','referral')),
  is_used     BOOLEAN NOT NULL DEFAULT FALSE,
  used_at     TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credits_user ON account_credits(user_id) WHERE is_used = FALSE;

-- ─── FUNNEL ANALYTICS EVENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funnel_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id  VARCHAR(80),
  event_type  VARCHAR(40) NOT NULL,   -- catalog_view, course_view, enroll, lesson_start, lesson_complete, course_complete
  course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id   UUID REFERENCES lessons(id) ON DELETE CASCADE,
  metadata    JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funnel_type   ON funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_course ON funnel_events(course_id);
CREATE INDEX IF NOT EXISTS idx_funnel_created ON funnel_events(created_at);

-- ─── STREAKS + DAILY GOAL ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_streaks (
  student_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak    INTEGER NOT NULL DEFAULT 0,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  last_active_date  DATE,
  daily_goal_lessons INTEGER NOT NULL DEFAULT 1,
  total_active_days INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_activity (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date     DATE NOT NULL,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  goal_met          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE (student_id, activity_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_activity_student ON daily_activity(student_id);

-- ─── COURSE FAQs (teacher-curated answers) ────────────────────────────────
CREATE TABLE IF NOT EXISTS course_faqs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_faqs_course ON course_faqs(course_id);

-- ─── TEACHER RESPONSIVENESS / SLA on comments ─────────────────────────────
-- A top-level comment is treated as a question. A teacher/admin reply marks
-- it answered, which lets us measure response time and overdue (>24h) items.
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS answered_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_comments_unanswered
  ON comments(course_id) WHERE parent_id IS NULL AND answered_at IS NULL;

-- ─── updated_at triggers for new tables ───────────────────────────────────
CREATE OR REPLACE TRIGGER bundles_updated_at
  BEFORE UPDATE ON bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER live_sessions_updated_at
  BEFORE UPDATE ON live_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER course_faqs_updated_at
  BEFORE UPDATE ON course_faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Default subscription plan so the feature works out of the box ────────
INSERT INTO subscription_plans (name, description, price, currency, interval, duration_days)
SELECT 'All-Access Monthly', 'Unlimited access to every published course for 30 days.', 15.00, 'USD', 'monthly', 30
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans);

-- ─── Backfill referral codes for existing users ───────────────────────────
UPDATE users
SET referral_code = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;
