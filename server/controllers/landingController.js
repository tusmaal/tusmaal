const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

const parseStat = v => parseInt(v, 10) || 0;

const resolveHomepageStats = (realRow, siteSettings) => {
  const real = {
    total_students: parseStat(realRow?.total_students),
    total_teachers: parseStat(realRow?.total_teachers),
    total_courses: parseStat(realRow?.total_courses),
    certificates_issued: parseStat(realRow?.certificates_issued),
  };
  const useMock = siteSettings.stats_use_mock === true || siteSettings.stats_use_mock === 'true';
  if (!useMock) {
    return { ...real, source: 'real' };
  }
  return {
    total_students: parseStat(siteSettings.mock_total_students),
    total_teachers: parseStat(siteSettings.mock_total_teachers),
    total_courses: parseStat(siteSettings.mock_total_courses),
    certificates_issued: parseStat(siteSettings.mock_certificates_issued),
    source: 'mock',
    real,
  };
};

// GET /api/landing  (public — one endpoint for the whole homepage)
const getLandingData = asyncHandler(async (req, res) => {
  const [settings, featured, categories, stats, teachers] = await Promise.all([
    // Site settings
    query('SELECT key, value FROM site_settings ORDER BY key'),

    // Featured courses
    query(
      `SELECT c.id, c.title, c.slug, c.description, c.thumbnail,
              c.price, c.currency, c.language, c.level,
              c.total_students, c.total_lessons,
              cat.name AS category, cat.icon AS category_icon,
              u.full_name AS teacher_name, u.profile_photo AS teacher_photo
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.is_published = TRUE AND c.is_featured = TRUE
       ORDER BY c.created_at DESC LIMIT 6`
    ),

    // All categories with course counts
    query(
      `SELECT cat.id, cat.name, cat.description, cat.icon,
              COUNT(c.id) AS course_count
       FROM categories cat
       LEFT JOIN courses c ON c.category_id = cat.id AND c.is_published = TRUE
       GROUP BY cat.id ORDER BY course_count DESC`
    ),

    // Platform stats
    query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = TRUE) AS total_students,
         (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = TRUE) AS total_teachers,
         (SELECT COUNT(*) FROM courses WHERE is_published = TRUE) AS total_courses,
         (SELECT COUNT(*) FROM certificates) AS certificates_issued`
    ),

    // Featured teachers
    query(
      `SELECT u.id, u.full_name, u.bio, u.profile_photo,
              COUNT(DISTINCT c.id) AS course_count,
              SUM(c.total_students) AS total_students
       FROM users u
       JOIN courses c ON c.teacher_id = u.id AND c.is_published = TRUE
       WHERE u.role = 'teacher' AND u.is_active = TRUE
       GROUP BY u.id
       ORDER BY total_students DESC NULLS LAST
       LIMIT 4`
    )
  ]);

  // Parse site settings into object
  const siteSettings = {};
  for (const row of settings.rows) {
    try { siteSettings[row.key] = JSON.parse(row.value); }
    catch { siteSettings[row.key] = row.value; }
  }

  const realStats = stats.rows[0] || {};
  const homepageStats = resolveHomepageStats(realStats, siteSettings);

  res.json({
    success: true,
    data: {
      settings: siteSettings,
      featured_courses: featured.rows,
      categories: categories.rows,
      stats: homepageStats,
      stats_real: {
        total_students: parseStat(realStats.total_students),
        total_teachers: parseStat(realStats.total_teachers),
        total_courses: parseStat(realStats.total_courses),
        certificates_issued: parseStat(realStats.certificates_issued),
      },
      featured_teachers: teachers.rows
    }
  });
});

// GET /api/teachers/:teacherId/profile  (public)
const getTeacherProfile = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  const teacher = await query(
    `SELECT u.id, u.full_name, u.bio, u.profile_photo, u.created_at
     FROM users u WHERE u.id = $1 AND u.role = 'teacher' AND u.is_active = TRUE`,
    [teacherId]
  );

  if (!teacher.rows.length) {
    return res.status(404).json({ success: false, message: 'Teacher not found.' });
  }

  const courses = await query(
    `SELECT c.id, c.title, c.slug, c.thumbnail, c.level, c.language,
            c.price, c.currency, c.total_students, c.total_lessons,
            cat.name AS category
     FROM courses c
     LEFT JOIN categories cat ON c.category_id = cat.id
     WHERE c.teacher_id = $1 AND c.is_published = TRUE
     ORDER BY c.created_at DESC`,
    [teacherId]
  );

  res.json({
    success: true,
    data: {
      teacher: teacher.rows[0],
      courses: courses.rows,
      total_students: courses.rows.reduce((s, c) => s + (c.total_students || 0), 0)
    }
  });
});

module.exports = { getLandingData, getTeacherProfile };
