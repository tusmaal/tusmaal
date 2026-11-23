-- ============================================================
-- DAY 2 ADDITIONS
-- Additional indexes and small schema improvements
-- ============================================================

-- Index: find all quiz attempts for a course (teacher analytics)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- Index: find submissions per assignment quickly
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);

-- Index: announcements per course
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);

-- Index: ungraded submissions (teacher dashboard pending count)
CREATE INDEX IF NOT EXISTS idx_submissions_ungraded ON assignment_submissions(assignment_id) WHERE grade IS NULL;

-- Add teacher_notes to student_course_access (admin can leave internal notes)
ALTER TABLE student_course_access
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT NULL;

-- Add word_count helper to lessons for text content
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE;

-- Add total_lessons cache to courses for fast catalog queries
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;

-- Function to keep total_lessons in sync
CREATE OR REPLACE FUNCTION sync_course_lesson_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses
  SET total_lessons = (
    SELECT COUNT(*) FROM lessons WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
  )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lessons_count_insert ON lessons;
CREATE TRIGGER lessons_count_insert
  AFTER INSERT OR DELETE ON lessons
  FOR EACH ROW EXECUTE FUNCTION sync_course_lesson_count();
