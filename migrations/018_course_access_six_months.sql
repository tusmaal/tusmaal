-- 6-month course access (replaces open-ended / lifetime access)

UPDATE student_course_access
SET expires_at = COALESCE(granted_at, NOW()) + INTERVAL '6 months'
WHERE expires_at IS NULL AND is_active = TRUE;

UPDATE site_faqs
SET
  question = 'How long do I have access to a course?',
  answer = 'Each course stays unlocked on your account for 6 months from the day we grant access. Study at your own pace during that period. Contact us on WhatsApp if you need to renew.',
  updated_at = NOW()
WHERE question ILIKE '%lifetime access%';
