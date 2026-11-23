const express = require('express');
const router = express.Router();

const { authenticate, adminOnly, teacherOrAdmin, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { loginLimiter, uploadLimiter } = require('../middleware/rateLimiter');

const {
  validate, loginRules, registerRules, changePasswordRules, createUserRules,
  createCourseRules, createSectionRules, createLessonRules,
  createAssignmentRules, gradeSubmissionRules,
  createQuizRules, addQuestionRules, submitQuizRules,
  createPaymentRules, grantAccessRules,
  createAnnouncementRules, reorderRules, reviewCourseRules
} = require('../middleware/validators');

const auth         = require('../controllers/authController');
const admin        = require('../controllers/adminController');
const course       = require('../controllers/courseController');
const student      = require('../controllers/studentController');
const teacher      = require('../controllers/teacherController');
const quiz         = require('../controllers/quizController');
const quizBuilder  = require('../controllers/quizBuilderController');
const assignment   = require('../controllers/assignmentController');
const reorder      = require('../controllers/reorderController');
const progress     = require('../controllers/progressController');
const certificate  = require('../controllers/certificateController');
const notification = require('../controllers/notificationController');
const comment      = require('../controllers/commentController');
const search       = require('../controllers/searchController');
const muxController = require('../controllers/muxController');
const reports      = require('../controllers/reportsController');
const settings     = require('../controllers/settingsController');
const landing      = require('../controllers/landingController');
const announcement = require('../controllers/announcementController');
const Category     = require('../controllers/categoryController');
const review       = require('../controllers/reviewController');

const coupon       = require('../controllers/couponController');
const bundle       = require('../controllers/bundleController');
const cohort       = require('../controllers/cohortController');
const live         = require('../controllers/liveSessionController');
const referral     = require('../controllers/referralController');
const funnel       = require('../controllers/funnelController');
const streak       = require('../controllers/streakController');
const faq          = require('../controllers/faqController');
const broadcast    = require('../controllers/broadcastController');
const siteFaq      = require('../controllers/siteFaqController');
const alumni       = require('../controllers/alumniController');
const team         = require('../controllers/teamController');

// ── PUBLIC ────────────────────────────────────────────────────────────────
router.get('/landing',                         landing.getLandingData);
router.get('/teachers/:teacherId/profile',     landing.getTeacherProfile);
router.get('/categories',                      Category.getCategories);
router.get('/search',                          search.globalSearch);
router.get('/courses',                         course.getCourses);
router.get('/courses/my',                      authenticate, teacherOrAdmin, course.getMyCourses);
router.get('/courses/featured',                search.getFeaturedCourses);
router.get('/courses/by-category/:categoryId', search.getCoursesByCategory);
router.get('/courses/:slug',                   course.getCourse);
router.get('/courses/:courseId/reviews',       review.getCourseReviews);
router.get('/settings',                        settings.getSettings);
router.get('/certificates/verify/:certNumber', certificate.verifyCertificate);
router.get('/unsubscribe',                     broadcast.publicUnsubscribe);
router.get('/site-faqs',                       siteFaq.listPublic);
router.get('/alumni',                          alumni.listAlumni);
router.get('/team',                            team.listPublic);

// ── AUTH ──────────────────────────────────────────────────────────────────
router.post('/auth/login',           loginLimiter, loginRules, validate, auth.login);
router.post('/auth/register',        loginLimiter, registerRules, validate, auth.register);
router.get ('/auth/me',              authenticate, auth.getMe);
router.put ('/auth/change-password', authenticate, changePasswordRules, validate, auth.changePassword);
router.put ('/auth/profile',         authenticate, upload.single('photo'), auth.updateProfile);

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────
router.get('/admin/dashboard', authenticate, adminOnly, admin.getDashboard);
router.get('/admin/courses/review', authenticate, adminOnly, course.getReviewQueue);
router.put('/admin/courses/:id/review', authenticate, adminOnly, reviewCourseRules, validate, course.reviewCourse);

// Users
router.get   ('/admin/users',                    authenticate, adminOnly, admin.getUsers);
router.post  ('/admin/users',                    authenticate, adminOnly, createUserRules, validate, admin.createUser);
router.get   ('/admin/users/:id',                authenticate, adminOnly, admin.getUser);
router.put   ('/admin/users/:id',                authenticate, adminOnly, admin.updateUser);
router.delete('/admin/users/:id',                authenticate, adminOnly, admin.deactivateUser);
router.put   ('/admin/users/:id/reset-password', authenticate, adminOnly, admin.resetPassword);

// Course access (payment gate)
router.get   ('/admin/students/:studentId/access',           authenticate, adminOnly, admin.getStudentAccess);
router.post  ('/admin/students/:studentId/access',           authenticate, adminOnly, grantAccessRules, validate, admin.grantAccess);
router.delete('/admin/students/:studentId/access/:courseId', authenticate, adminOnly, admin.revokeAccess);

// Payments
router.get ('/admin/payments', authenticate, adminOnly, admin.getPayments);
router.post('/admin/payments', authenticate, adminOnly, createPaymentRules, validate, admin.createPayment);

// Settings
router.put('/settings',      authenticate, adminOnly, settings.updateSettings);
router.put('/settings/logo', authenticate, adminOnly, upload.single('logo'), settings.uploadLogo);

// Categories
router.post  ('/categories',     authenticate, adminOnly, Category.createCategory);
router.put   ('/categories/:id', authenticate, adminOnly, Category.updateCategory);
router.delete('/categories/:id', authenticate, adminOnly, Category.deleteCategory);

// ── REPORTS ───────────────────────────────────────────────────────────────
router.get('/reports/overview',      authenticate, adminOnly, reports.overviewReport);
router.get('/reports/enrollments',   authenticate, adminOnly, reports.enrollmentsReport);
router.get('/reports/students',      authenticate, adminOnly, reports.studentsReport);
router.get('/reports/courses',       authenticate, adminOnly, reports.coursesReport);
router.get('/reports/revenue',       authenticate, adminOnly, reports.revenueReport);
router.get('/reports/monthly-stats', authenticate, adminOnly, reports.monthlyStats);
router.get('/admin/reports/student-progress/:studentId', authenticate, adminOnly, admin.getStudentProgress);

// ── COURSES ───────────────────────────────────────────────────────────────
router.post  ('/courses',     authenticate, teacherOrAdmin, uploadLimiter, upload.single('thumbnail'), createCourseRules, validate, course.createCourse);
router.put   ('/courses/:id', authenticate, teacherOrAdmin, uploadLimiter, upload.single('thumbnail'), course.updateCourse);
router.post  ('/courses/:id/submit-review', authenticate, teacherOrAdmin, course.submitForReview);
router.delete('/courses/:id', authenticate, adminOnly, course.deleteCourse);

router.get   ('/courses/:courseId/sections',            authenticate, course.getSections);
router.post  ('/courses/:courseId/sections',            authenticate, teacherOrAdmin, createSectionRules, validate, course.createSection);
router.put   ('/courses/:courseId/sections/reorder',    authenticate, teacherOrAdmin, reorderRules, validate, reorder.reorderSections);
router.put   ('/courses/:courseId/sections/:sectionId', authenticate, teacherOrAdmin, course.updateSection);
router.delete('/courses/:courseId/sections/:sectionId', authenticate, teacherOrAdmin, course.deleteSection);

router.post(
  '/courses/:courseId/sections/:sectionId/lessons',
  authenticate, teacherOrAdmin, uploadLimiter,
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]),
  createLessonRules, validate, course.createLesson
);
router.put   ('/courses/:courseId/lessons/reorder',   authenticate, teacherOrAdmin, reorderRules, validate, reorder.reorderLessons);
router.put   ('/courses/:courseId/lessons/:lessonId', authenticate, teacherOrAdmin, course.updateLesson);
router.delete('/courses/:courseId/lessons/:lessonId', authenticate, teacherOrAdmin, course.deleteLesson);

router.post  ('/courses/:courseId/reviews',           authenticate, review.createReview);
router.delete('/courses/:courseId/reviews/:reviewId', authenticate, review.deleteReview);

// ── TEACHER DASHBOARD ─────────────────────────────────────────────────────
router.get('/teacher/dashboard',                    authenticate, teacherOrAdmin, teacher.getDashboard);
router.get('/teacher/courses/:courseId/students',   authenticate, teacherOrAdmin, teacher.getCourseStudents);
router.get('/teacher/courses/:courseId/analytics',  authenticate, teacherOrAdmin, teacher.getCourseAnalytics);
router.get('/teacher/students/:studentId/progress', authenticate, teacherOrAdmin, teacher.getStudentDetailProgress);

// ── STUDENT PORTAL ────────────────────────────────────────────────────────
router.get ('/student/dashboard',                  authenticate, student.getDashboard);
router.get ('/student/courses',                    authenticate, student.getMyCourses);
router.get ('/student/courses/:courseId',          authenticate, student.getCourseContent);
router.post('/student/lessons/:lessonId/complete', authenticate, student.completeLesson);
router.get ('/student/certificates',               authenticate, student.getCertificates);
router.get ('/student/announcements',              authenticate, student.getAnnouncements);

// ── VIDEO UPLOADS (MUX) ───────────────────────────────────────────────────
router.post('/videos/lessons/:lessonId/upload-url', authenticate, teacherOrAdmin, muxController.createLessonUploadUrl);
router.post('/videos/lessons/:lessonId/reconcile',  authenticate, teacherOrAdmin, muxController.reconcileLesson);

// ── PROGRESS ──────────────────────────────────────────────────────────────
router.get ('/progress/summary',               authenticate, progress.getProgressSummary);
router.get ('/progress/course/:courseId',      authenticate, progress.getCourseProgress);
router.post('/progress/lesson/:lessonId/track',authenticate, progress.trackLessonProgress);

// ── CERTIFICATES ──────────────────────────────────────────────────────────
router.get ('/certificates/:certificateId/download',   authenticate, certificate.downloadCertificate);
router.post('/certificates/regenerate/:certificateId', authenticate, adminOnly, certificate.regenerateCertificate);
router.post('/admin/certificates/regenerate-all',      authenticate, adminOnly, certificate.regenerateAllCertificates);
router.post('/admin/certificates/preview',             authenticate, adminOnly, certificate.previewCertificate);

// ── QUIZZES ───────────────────────────────────────────────────────────────
router.get   ('/quizzes',       authenticate, quiz.listQuizzes);
router.post  ('/quizzes',       authenticate, teacherOrAdmin, createQuizRules, validate, quiz.createQuiz);
router.get   ('/quizzes/:quizId',authenticate, quiz.getQuiz);
router.put   ('/quizzes/:quizId',authenticate, teacherOrAdmin, quizBuilder.updateQuiz);
router.delete('/quizzes/:quizId',authenticate, teacherOrAdmin, quizBuilder.deleteQuiz);

router.get   ('/quizzes/:quizId/questions',                 authenticate, quizBuilder.getQuestions);
router.post  ('/quizzes/:quizId/questions',                 authenticate, teacherOrAdmin, addQuestionRules, validate, quizBuilder.addQuestion);
router.put   ('/quizzes/:quizId/questions/reorder',         authenticate, teacherOrAdmin, reorderRules, validate, quizBuilder.reorderQuestions);
router.put   ('/quizzes/:quizId/questions/:questionId',     authenticate, teacherOrAdmin, quizBuilder.updateQuestion);
router.delete('/quizzes/:quizId/questions/:questionId',     authenticate, teacherOrAdmin, quizBuilder.deleteQuestion);
router.post  ('/quizzes/:quizId/submit',                    authenticate, submitQuizRules, validate, quiz.submitQuiz);
router.get   ('/quizzes/:quizId/results',                   authenticate, quiz.getQuizResults);
router.get   ('/quizzes/:quizId/all-attempts',              authenticate, teacherOrAdmin, quizBuilder.getAllAttempts);

// ── ASSIGNMENTS ───────────────────────────────────────────────────────────
router.get   ('/assignments',     authenticate, assignment.getAssignments);
router.post  ('/assignments',     authenticate, teacherOrAdmin, createAssignmentRules, validate, assignment.createAssignment);
router.put   ('/assignments/:id', authenticate, teacherOrAdmin, assignment.updateAssignment);
router.delete('/assignments/:id', authenticate, teacherOrAdmin, assignment.deleteAssignment);

router.get('/assignments/:id/submissions',                                 authenticate, teacherOrAdmin, assignment.getSubmissions);
router.put('/assignments/:assignmentId/submissions/:submissionId/grade',   authenticate, teacherOrAdmin, gradeSubmissionRules, validate, assignment.gradeSubmission);
router.post('/assignments/:id/submit',      authenticate, uploadLimiter, upload.single('file'), assignment.submitAssignment);
router.get ('/assignments/:id/my-submission', authenticate, assignment.getMySubmission);

// ── COMMENTS ──────────────────────────────────────────────────────────────
router.get   ('/lessons/:lessonId/comments',  authenticate, comment.getLessonComments);
router.post  ('/lessons/:lessonId/comments',  authenticate, comment.createComment);
router.get   ('/comments/:commentId/replies', authenticate, comment.getReplies);
router.put   ('/comments/:commentId',         authenticate, comment.updateComment);
router.delete('/comments/:commentId',         authenticate, comment.deleteComment);
router.put   ('/comments/:commentId/pin',     authenticate, teacherOrAdmin, comment.pinComment);

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
router.get   ('/announcements',     authenticate, announcement.getAnnouncements);
router.post  ('/announcements',     authenticate, teacherOrAdmin, createAnnouncementRules, validate, announcement.createAnnouncement);
router.delete('/announcements/:id', authenticate, teacherOrAdmin, announcement.deleteAnnouncement);

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
router.get   ('/notifications',           authenticate, notification.getNotifications);
router.put   ('/notifications/mark-read', authenticate, notification.markAsRead);
router.delete('/notifications/clear',     authenticate, notification.clearNotifications);

// ══════════════════════════════════════════════════════════════════════════
// GROWTH FEATURES
// ══════════════════════════════════════════════════════════════════════════

// ── COUPONS ───────────────────────────────────────────────────────────────
router.get   ('/admin/coupons',     authenticate, adminOnly, coupon.listCoupons);
router.post  ('/admin/coupons',     authenticate, adminOnly, coupon.createCoupon);
router.put   ('/admin/coupons/:id', authenticate, adminOnly, coupon.updateCoupon);
router.delete('/admin/coupons/:id', authenticate, adminOnly, coupon.deleteCoupon);
router.post  ('/coupons/validate',  authenticate, coupon.validateCoupon);
router.post  ('/coupons/redeem',    authenticate, coupon.redeemCoupon);
router.get   ('/me/coupons',        authenticate, coupon.myCoupons);

// ── BUNDLES & SUBSCRIPTIONS ───────────────────────────────────────────────
router.get   ('/bundles',                authenticate, bundle.listBundles); // pass-through; admin sees inactive
router.post  ('/admin/bundles',          authenticate, adminOnly, bundle.createBundle);
router.put   ('/admin/bundles/:id',      authenticate, adminOnly, bundle.updateBundle);
router.delete('/admin/bundles/:id',      authenticate, adminOnly, bundle.deleteBundle);
router.post  ('/admin/bundles/:id/grant',authenticate, adminOnly, bundle.grantBundleAccess);

router.get ('/subscription-plans',                       optionalAuth, bundle.listPlans);
router.post('/admin/subscription-plans',                 authenticate, adminOnly, bundle.createPlan);
router.post('/admin/students/:studentId/subscription',   authenticate, adminOnly, bundle.grantSubscription);
router.get ('/me/subscription',                          authenticate, bundle.mySubscription);

// ── COHORTS / BATCHES + DRIP ──────────────────────────────────────────────
router.get   ('/courses/:courseId/cohorts', authenticate, teacherOrAdmin, cohort.listCohorts);
router.post  ('/courses/:courseId/cohorts', authenticate, teacherOrAdmin, cohort.createCohort);
router.put   ('/cohorts/:id',               authenticate, teacherOrAdmin, cohort.updateCohort);
router.delete('/cohorts/:id',               authenticate, teacherOrAdmin, cohort.deleteCohort);
router.get   ('/cohorts/:id/students',      authenticate, teacherOrAdmin, cohort.getCohortStudents);
router.post  ('/cohorts/:id/enroll',        authenticate, teacherOrAdmin, cohort.enrollStudent);
router.delete('/cohorts/:id/students/:studentId', authenticate, teacherOrAdmin, cohort.removeStudent);
router.put   ('/sections/:sectionId/drip',  authenticate, teacherOrAdmin, cohort.setSectionDrip);

// ── LIVE CLASSES ──────────────────────────────────────────────────────────
router.get   ('/courses/:courseId/live-sessions', authenticate, teacherOrAdmin, live.listForCourse);
router.post  ('/courses/:courseId/live-sessions', authenticate, teacherOrAdmin, live.createSession);
router.put   ('/live-sessions/:id',               authenticate, teacherOrAdmin, live.updateSession);
router.delete('/live-sessions/:id',               authenticate, teacherOrAdmin, live.deleteSession);
router.get   ('/student/live-sessions',           authenticate, live.myUpcoming);

// ── REFERRALS & CREDITS ───────────────────────────────────────────────────
router.get('/me/referral',      authenticate, referral.myReferral);
router.get('/me/credits',       authenticate, referral.myCredits);
router.get('/admin/referrals',  authenticate, adminOnly, referral.adminReferrals);

// ── FUNNEL ANALYTICS ──────────────────────────────────────────────────────
router.post('/track',                                  optionalAuth, funnel.track);
router.get ('/admin/funnel/overview',                  authenticate, adminOnly, funnel.overview);
router.get ('/admin/funnel/course/:courseId/dropoff',  authenticate, adminOnly, funnel.lessonDropoff);

// ── STREAKS + DAILY GOAL ──────────────────────────────────────────────────
router.get('/me/streak',      authenticate, streak.getStreak);
router.put('/me/streak/goal', authenticate, streak.setGoal);

// ── COURSE FAQs + TEACHER SLA ─────────────────────────────────────────────
router.get   ('/courses/:courseId/faqs', faq.listFaqs); // public
router.post  ('/courses/:courseId/faqs', authenticate, teacherOrAdmin, faq.createFaq);
router.put   ('/faqs/:id',               authenticate, teacherOrAdmin, faq.updateFaq);
router.delete('/faqs/:id',               authenticate, teacherOrAdmin, faq.deleteFaq);
router.get   ('/teacher/sla',            authenticate, teacherOrAdmin, faq.slaMetrics);
router.get   ('/teacher/sla/inbox',      authenticate, teacherOrAdmin, faq.slaInbox);

// ── EMAIL BROADCAST / NEWSLETTER ──────────────────────────────────────────
router.get ('/admin/broadcasts',         authenticate, adminOnly, broadcast.listCampaigns);
router.post('/admin/broadcasts/preview', authenticate, adminOnly, broadcast.previewAudience);
router.post('/admin/broadcasts',         authenticate, adminOnly, broadcast.createAndSend);
router.get ('/admin/broadcasts/:id',     authenticate, adminOnly, broadcast.getCampaign);

// ── SITE FAQ MANAGEMENT ───────────────────────────────────────────────────
router.get   ('/admin/site-faqs',     authenticate, adminOnly, siteFaq.listAll);
router.post  ('/admin/site-faqs',     authenticate, adminOnly, siteFaq.createFaq);
router.put   ('/admin/site-faqs/:id', authenticate, adminOnly, siteFaq.updateFaq);
router.delete('/admin/site-faqs/:id', authenticate, adminOnly, siteFaq.deleteFaq);

// ── TEAM (About page) ─────────────────────────────────────────────────────
router.get   ('/admin/team',     authenticate, adminOnly, team.listAll);
router.post  ('/admin/team',     authenticate, adminOnly, upload.single('photo'), team.createMember);
router.put   ('/admin/team/:id', authenticate, adminOnly, upload.single('photo'), team.updateMember);
router.delete('/admin/team/:id', authenticate, adminOnly, team.deleteMember);

// ── ALUMNI SPOTLIGHTS (curated success stories) ───────────────────────────
router.get   ('/admin/alumni',     authenticate, adminOnly, alumni.listAll);
router.post  ('/admin/alumni',     authenticate, adminOnly, uploadLimiter,
  upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'story_pdf', maxCount: 1 }]),
  alumni.createSpotlight);
router.put   ('/admin/alumni/:id', authenticate, adminOnly, uploadLimiter,
  upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'story_pdf', maxCount: 1 }]),
  alumni.updateSpotlight);
router.delete('/admin/alumni/:id', authenticate, adminOnly, alumni.deleteSpotlight);

module.exports = router;
