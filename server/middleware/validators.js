const { body, param, query, validationResult } = require('express-validator');

// Middleware: run after validators, return 400 if any fail
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// ─── AUTH ─────────────────────────────────────────────────────────────────
const loginRules = [
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
];

const registerRules = [
  body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('referral_code').optional({ checkFalsy: true }).trim()
];

const changePasswordRules = [
  body('current_password').notEmpty().withMessage('Current password is required.'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter.')
    .matches(/[0-9]/).withMessage('New password must contain a number.')
];

// ─── USERS ────────────────────────────────────────────────────────────────
const createUserRules = [
  body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role')
    .isIn(['student', 'teacher']).withMessage('Role must be student or teacher.')
];

// ─── COURSES ──────────────────────────────────────────────────────────────
const createCourseRules = [
  body('title').trim().notEmpty().withMessage('Course title is required.')
    .isLength({ max: 255 }).withMessage('Title must be under 255 characters.'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('level').optional()
    .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Level must be beginner, intermediate, or advanced.'),
  body('duration_hours').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer.')
];

const createSectionRules = [
  body('title').trim().notEmpty().withMessage('Section title is required.'),
  body('order_index').optional().isInt({ min: 0 }).withMessage('order_index must be a non-negative integer.')
];

const createLessonRules = [
  body('title').trim().notEmpty().withMessage('Lesson title is required.'),
  body('content_type')
    .isIn(['video', 'text', 'pdf', 'youtube']).withMessage('content_type must be video, text, pdf, or youtube.'),
  body('youtube_url').optional().isURL().withMessage('youtube_url must be a valid URL.'),
  body('duration_minutes').optional().isInt({ min: 0 }).withMessage('duration_minutes must be a non-negative integer.')
];

// ─── ASSIGNMENTS ──────────────────────────────────────────────────────────
const createAssignmentRules = [
  body('course_id').isUUID().withMessage('Valid course_id (UUID) is required.'),
  body('title').trim().notEmpty().withMessage('Assignment title is required.'),
  body('due_date').optional().isISO8601().withMessage('due_date must be a valid date (ISO 8601).'),
  body('max_grade').optional().isInt({ min: 1, max: 1000 }).withMessage('max_grade must be between 1 and 1000.')
];

const gradeSubmissionRules = [
  body('grade').isInt({ min: 0 }).withMessage('Grade must be a non-negative integer.'),
  body('feedback').optional().trim()
];

// ─── QUIZZES ──────────────────────────────────────────────────────────────
const createQuizRules = [
  body('course_id').isUUID().withMessage('Valid course_id (UUID) is required.'),
  body('title').trim().notEmpty().withMessage('Quiz title is required.'),
  body('pass_score').optional().isInt({ min: 1, max: 100 }).withMessage('pass_score must be 1–100.'),
  body('max_attempts').optional().isInt({ min: 1 }).withMessage('max_attempts must be at least 1.')
];

const addQuestionRules = [
  body('question').trim().notEmpty().withMessage('Question text is required.'),
  body('question_type').optional().isIn(['mcq', 'true_false']).withMessage('question_type must be mcq or true_false.'),
  body('correct_answer').notEmpty().withMessage('correct_answer is required.'),
  body('options').optional().isArray({ min: 2 }).withMessage('options must be an array with at least 2 items.'),
  body('points').optional().isInt({ min: 1 }).withMessage('points must be at least 1.')
];

const submitQuizRules = [
  body('answers').isObject().withMessage('answers must be an object mapping question_id to answer.')
];

// ─── PAYMENTS ─────────────────────────────────────────────────────────────
const createPaymentRules = [
  body('student_id').isUUID().withMessage('Valid student_id (UUID) is required.'),
  body('course_id').isUUID().withMessage('Valid course_id (UUID) is required.'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount must be greater than 0.'),
  body('payment_date').isISO8601().withMessage('payment_date must be a valid date.')
];

// ─── ACCESS CONTROL ───────────────────────────────────────────────────────
const grantAccessRules = [
  body('course_id').isUUID().withMessage('Valid course_id (UUID) is required.')
];

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────
const createAnnouncementRules = [
  body('title').trim().notEmpty().withMessage('Announcement title is required.'),
  body('body').trim().notEmpty().withMessage('Announcement body is required.'),
  body('course_id').optional().isUUID().withMessage('course_id must be a valid UUID.')
];

const reviewCourseRules = [
  body('action').isIn(['pending_review', 'publish', 'reject']).withMessage('action must be pending_review, publish or reject.'),
  body('comment').optional().trim().isLength({ max: 2000 }).withMessage('comment must be under 2000 characters.')
];

// ─── REORDER ──────────────────────────────────────────────────────────────
const reorderRules = [
  body('order').isArray({ min: 1 }).withMessage('order must be a non-empty array.'),
  body('order.*.id').isUUID().withMessage('Each item must have a valid UUID id.'),
  body('order.*.order_index').isInt({ min: 0 }).withMessage('Each item must have a non-negative order_index.')
];

module.exports = {
  validate,
  loginRules, registerRules, changePasswordRules,
  createUserRules,
  createCourseRules, createSectionRules, createLessonRules,
  createAssignmentRules, gradeSubmissionRules,
  createQuizRules, addQuestionRules, submitQuizRules,
  createPaymentRules, grantAccessRules,
  createAnnouncementRules, reorderRules,
  reviewCourseRules
};
