ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS course_status VARCHAR(20) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS review_comment TEXT,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'courses_course_status_check'
      AND table_name = 'courses'
  ) THEN
    ALTER TABLE courses
      ADD CONSTRAINT courses_course_status_check
      CHECK (course_status IN ('draft', 'pending_review', 'published', 'rejected'));
  END IF;
END $$;

UPDATE courses
SET course_status = CASE WHEN is_published = TRUE THEN 'published' ELSE 'draft' END
WHERE course_status IS NULL OR course_status NOT IN ('draft', 'pending_review', 'published', 'rejected');

CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(course_status);
