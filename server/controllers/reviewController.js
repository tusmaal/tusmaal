const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { scaActivePlain } = require('../utils/courseAccess');

// GET /api/courses/:courseId/reviews
const getCourseReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT r.id, r.rating, r.review_text, r.created_at,
            u.full_name AS student_name, u.profile_photo AS student_photo
     FROM course_reviews r
     JOIN users u ON r.student_id = u.id
     WHERE r.course_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.params.courseId, limit, offset]
  );

  const stats = await query(
    `SELECT
       COUNT(*) AS total_reviews,
       ROUND(AVG(rating), 1) AS avg_rating,
       COUNT(*) FILTER (WHERE rating = 5) AS five_star,
       COUNT(*) FILTER (WHERE rating = 4) AS four_star,
       COUNT(*) FILTER (WHERE rating = 3) AS three_star,
       COUNT(*) FILTER (WHERE rating = 2) AS two_star,
       COUNT(*) FILTER (WHERE rating = 1) AS one_star
     FROM course_reviews WHERE course_id = $1`,
    [req.params.courseId]
  );

  res.json({
    success: true,
    data: result.rows,
    stats: stats.rows[0],
    pagination: { page: parseInt(page), limit: parseInt(limit) }
  });
});

// POST /api/courses/:courseId/reviews  (student only, must have completed the course)
const createReview = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { rating, review_text } = req.body;
  const studentId = req.user.id;

  if (!rating || rating < 1 || rating > 5) throw createError('Rating must be between 1 and 5.');

  // Student must have access
  const access = await query(
    `SELECT id FROM student_course_access WHERE student_id = $1 AND course_id = $2 AND ${scaActivePlain()}`,
    [studentId, courseId]
  );
  if (!access.rows.length) throw createError('You must be enrolled to review this course.', 403);

  const result = await query(
    `INSERT INTO course_reviews (id, course_id, student_id, rating, review_text)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (course_id, student_id)
     DO UPDATE SET rating = $4, review_text = $5, created_at = NOW()
     RETURNING *`,
    [uuidv4(), courseId, studentId, rating, review_text || null]
  );

  res.status(201).json({ success: true, message: 'Review submitted.', data: result.rows[0] });
});

// DELETE /api/courses/:courseId/reviews/:reviewId
const deleteReview = asyncHandler(async (req, res) => {
  const existing = await query('SELECT student_id FROM course_reviews WHERE id = $1', [req.params.reviewId]);
  if (!existing.rows.length) throw createError('Review not found.', 404);
  if (req.user.role === 'student' && existing.rows[0].student_id !== req.user.id) {
    throw createError('You can only delete your own reviews.', 403);
  }
  await query('DELETE FROM course_reviews WHERE id = $1', [req.params.reviewId]);
  res.json({ success: true, message: 'Review deleted.' });
});

module.exports = { getCourseReviews, createReview, deleteReview };
