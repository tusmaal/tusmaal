const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/search?q=python&type=courses,teachers&page=1&limit=10
const globalSearch = asyncHandler(async (req, res) => {
  const { q, type = 'courses', page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters.' });
  }

  const term = `%${q.trim()}%`;
  const types = type.split(',').map(t => t.trim());
  const results = {};

  if (types.includes('courses')) {
    const courses = await query(
      `SELECT c.id, c.title, c.slug, c.description, c.thumbnail, c.price,
              c.language, c.level, c.total_students, c.total_lessons,
              cat.name AS category, u.full_name AS teacher_name
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.is_published = TRUE
         AND (c.title ILIKE $1 OR c.description ILIKE $1 OR cat.name ILIKE $1 OR u.full_name ILIKE $1)
       ORDER BY c.is_featured DESC, c.total_students DESC
       LIMIT $2 OFFSET $3`,
      [term, limit, offset]
    );
    results.courses = courses.rows;
  }

  if (types.includes('teachers')) {
    const teachers = await query(
      `SELECT u.id, u.full_name, u.bio, u.profile_photo,
              COUNT(c.id) AS course_count
       FROM users u
       LEFT JOIN courses c ON c.teacher_id = u.id AND c.is_published = TRUE
       WHERE u.role = 'teacher' AND u.is_active = TRUE
         AND (u.full_name ILIKE $1 OR u.bio ILIKE $1)
       GROUP BY u.id
       LIMIT $2 OFFSET $3`,
      [term, limit, offset]
    );
    results.teachers = teachers.rows;
  }

  if (types.includes('categories')) {
    const categories = await query(
      `SELECT cat.id, cat.name, cat.description, cat.icon,
              COUNT(c.id) AS course_count
       FROM categories cat
       LEFT JOIN courses c ON c.category_id = cat.id AND c.is_published = TRUE
       WHERE cat.name ILIKE $1 OR cat.description ILIKE $1
       GROUP BY cat.id`,
      [term]
    );
    results.categories = categories.rows;
  }

  res.json({ success: true, query: q, data: results });
});

// GET /api/courses/featured
const getFeaturedCourses = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.id, c.title, c.slug, c.description, c.thumbnail, c.price,
            c.language, c.level, c.total_students, c.total_lessons,
            cat.name AS category, u.full_name AS teacher_name, u.profile_photo AS teacher_photo
     FROM courses c
     LEFT JOIN categories cat ON c.category_id = cat.id
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE c.is_published = TRUE AND c.is_featured = TRUE
     ORDER BY c.created_at DESC LIMIT 6`
  );
  res.json({ success: true, data: result.rows });
});

// GET /api/courses/by-category/:categoryId
const getCoursesByCategory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT c.id, c.title, c.slug, c.thumbnail, c.price, c.level,
            c.total_students, c.language, u.full_name AS teacher_name
     FROM courses c
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE c.category_id = $1 AND c.is_published = TRUE
     ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`,
    [req.params.categoryId, limit, offset]
  );

  const total = await query(
    'SELECT COUNT(*) FROM courses WHERE category_id = $1 AND is_published = TRUE',
    [req.params.categoryId]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: { total: parseInt(total.rows[0].count), page: parseInt(page), limit: parseInt(limit) }
  });
});

module.exports = { globalSearch, getFeaturedCourses, getCoursesByCategory };
