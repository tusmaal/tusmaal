const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const getCategories = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.id, c.name, c.description, c.icon, c.created_at,
            COUNT(co.id) AS course_count
     FROM categories c
     LEFT JOIN courses co ON co.category_id = c.id AND co.is_published = TRUE
     GROUP BY c.id ORDER BY c.name`
  );
  res.json({ success: true, data: result.rows });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;
  if (!name) throw createError('Category name is required.');
  const result = await query(
    'INSERT INTO categories (id, name, description, icon) VALUES ($1,$2,$3,$4) RETURNING *',
    [uuidv4(), name, description, icon]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;
  const result = await query(
    `UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description),
     icon = COALESCE($3, icon) WHERE id = $4 RETURNING *`,
    [name, description, icon, req.params.id]
  );
  if (!result.rows.length) throw createError('Category not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Category deleted.' });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
