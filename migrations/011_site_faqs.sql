-- ============================================================
-- 011  SITE-WIDE FAQ
-- Public, admin-managed frequently asked questions (separate from
-- the per-course FAQs in course_faqs). Additive & idempotent.
-- ============================================================
CREATE TABLE IF NOT EXISTS site_faqs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL,
  category     VARCHAR(60) NOT NULL DEFAULT 'General',
  order_index  INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_faqs_category ON site_faqs(category);

-- Seed starter FAQs only if the table is empty (won't duplicate on re-run).
INSERT INTO site_faqs (question, answer, category, order_index)
SELECT * FROM (VALUES
  ('Is it free to create an account?',
   'Yes. Creating an Tusmaal account is completely free. You can sign up, browse our course catalog, and receive our newsletters and announcements at no cost. You only pay when you enroll in a paid course.',
   'Getting Started', 1),
  ('How do I sign up?',
   'Click "Get Started" or "Register", enter your name, email, phone and a password. Once registered you''ll receive our updates by email. To unlock a course, contact us and we''ll activate it for you.',
   'Getting Started', 2),
  ('I registered but I can''t see any courses in my dashboard. Why?',
   'A new account is a free subscriber account. Course access (and your full dashboard) is unlocked after you enroll. Contact us on WhatsApp with the email you registered with, and we''ll grant you the course you want.',
   'Getting Started', 3),
  ('How do I enroll in a course?',
   'Browse the course catalog, then contact us on WhatsApp and tell us which course you want and the email you registered with. After payment we''ll unlock the course on your account.',
   'Courses & Enrollment', 1),
  ('Can I learn in Somali?',
   'Yes! Most of our courses are taught in Somali so you can learn comfortably in your own language.',
   'Courses & Enrollment', 2),
  ('How long do I have access to a course?',
   'Each course stays unlocked on your account for 6 months from the day we grant access. Study at your own pace during that period. Contact us on WhatsApp if you need to renew.',
   'Courses & Enrollment', 3),
  ('How do I pay?',
   'We accept EVC Plus, eDahab and Zaad. Contact us on WhatsApp and we''ll guide you through the payment and unlock your course.',
   'Payments', 1),
  ('Are there discounts or coupons?',
   'Yes — we run promotions from time to time. Subscribe with your email and follow us on social media to be notified of new courses and special offers.',
   'Payments', 2),
  ('Do I get a certificate?',
   'Yes. When you complete a course you earn a certificate you can download and share. Each certificate has a unique number that can be verified.',
   'Certificates', 1),
  ('How do I reset my password?',
   'Contact our team and we''ll reset it for you. Always change your password after logging in for the first time.',
   'Account', 1),
  ('How can I contact Tusmaal?',
   'Reach us on WhatsApp or phone at +252 61 7090076, email info@tusmaalinstitute.org, or from the contact page.',
   'Account', 2)
) AS v(question, answer, category, order_index)
WHERE NOT EXISTS (SELECT 1 FROM site_faqs);
