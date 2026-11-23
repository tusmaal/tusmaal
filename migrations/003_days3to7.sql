-- ============================================================
-- DAYS 3–7 MIGRATION
-- notifications, comments, site_settings tables
-- ============================================================

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ─── COMMENTS / DISCUSSION ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_lesson ON comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

CREATE OR REPLACE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SITE SETTINGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Default settings
INSERT INTO site_settings (key, value) VALUES
  ('platform_name',    'Tusmaal'),
  ('platform_tagline', 'Quality Education for Everyone'),
  ('contact_email',    'info@tusmaal.com'),
  ('contact_phone',    ''),
  ('contact_address',  'Mogadishu, Somalia'),
  ('hero_title',       'Learn New Skills Online'),
  ('hero_subtitle',    'Access quality courses taught by expert instructors'),
  ('footer_text',      '© 2026 Tusmaal'),
  ('currency_default', 'USD'),
  ('primary_color',    '#1a5276')
ON CONFLICT (key) DO NOTHING;

-- ─── COURSE REVIEWS (Day 7 bonus) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_course ON course_reviews(course_id);

-- Add avg_rating cache column to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0;

-- Auto-update avg_rating when a review is inserted/updated
CREATE OR REPLACE FUNCTION sync_course_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses SET avg_rating = (
    SELECT COALESCE(AVG(rating), 0) FROM course_reviews
    WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
  ) WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_rating_sync ON course_reviews;
CREATE TRIGGER reviews_rating_sync
  AFTER INSERT OR UPDATE OR DELETE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION sync_course_rating();

-- ─── PERFORMANCE: Full text search index on courses ───────────────────────
CREATE INDEX IF NOT EXISTS idx_courses_fts ON courses
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
