const { getClient } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { query } = require('../config/database');

// Helper: verify teacher owns course
const verifyCourseOwnership = async (courseId, userId, role) => {
  const result = await query(
    'SELECT id, teacher_id FROM courses WHERE id = $1',
    [courseId]
  );
  if (!result.rows.length) throw createError('Course not found.', 404);
  if (role === 'teacher' && result.rows[0].teacher_id !== userId) {
    throw createError('You can only modify your own courses.', 403);
  }
};

// PUT /api/courses/:courseId/sections/reorder
// Body: { order: [ { id, order_index }, ... ] }
const reorderSections = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { order } = req.body;

  if (!Array.isArray(order) || !order.length) throw createError('order array is required.');
  await verifyCourseOwnership(courseId, req.user.id, req.user.role);

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const item of order) {
      await client.query(
        'UPDATE sections SET order_index = $1 WHERE id = $2 AND course_id = $3',
        [item.order_index, item.id, courseId]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Sections reordered.' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// PUT /api/courses/:courseId/lessons/reorder
// Body: { order: [ { id, order_index, section_id }, ... ] }
// Supports moving a lesson to a different section
const reorderLessons = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { order } = req.body;

  if (!Array.isArray(order) || !order.length) throw createError('order array is required.');
  await verifyCourseOwnership(courseId, req.user.id, req.user.role);

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const item of order) {
      await client.query(
        `UPDATE lessons SET order_index = $1, section_id = COALESCE($2, section_id)
         WHERE id = $3 AND course_id = $4`,
        [item.order_index, item.section_id || null, item.id, courseId]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Lessons reordered.' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { reorderSections, reorderLessons };
