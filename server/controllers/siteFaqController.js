const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// GET /api/site-faqs  (public) — published FAQs, grouped by category
const listPublic = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, question, answer, category, order_index
     FROM site_faqs WHERE is_published = TRUE
     ORDER BY category, order_index, created_at`
  );
  res.json({ success: true, data: result.rows });
});

// GET /api/admin/site-faqs  (admin) — all FAQs
const listAll = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, question, answer, category, order_index, is_published, created_at
     FROM site_faqs ORDER BY category, order_index, created_at`
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/admin/site-faqs
const createFaq = asyncHandler(async (req, res) => {
  const { question, answer, category, order_index = 0, is_published = true } = req.body;
  if (!question || !question.trim()) throw createError('Question is required.');
  if (!answer || !answer.trim()) throw createError('Answer is required.');
  const result = await query(
    `INSERT INTO site_faqs (id, question, answer, category, order_index, is_published, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [uuidv4(), question.trim(), answer.trim(), (category || 'General').trim(), order_index, is_published, req.user.id]
  );
  res.status(201).json({ success: true, message: 'FAQ created.', data: result.rows[0] });
});

// PUT /api/admin/site-faqs/:id
const updateFaq = asyncHandler(async (req, res) => {
  const { question, answer, category, order_index, is_published } = req.body;
  const result = await query(
    `UPDATE site_faqs SET
       question = COALESCE($2, question),
       answer = COALESCE($3, answer),
       category = COALESCE($4, category),
       order_index = COALESCE($5, order_index),
       is_published = COALESCE($6, is_published),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id, question, answer, category, order_index, is_published]
  );
  if (!result.rows.length) throw createError('FAQ not found.', 404);
  res.json({ success: true, message: 'FAQ updated.', data: result.rows[0] });
});

// DELETE /api/admin/site-faqs/:id
const deleteFaq = asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM site_faqs WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) throw createError('FAQ not found.', 404);
  res.json({ success: true, message: 'FAQ deleted.' });
});

module.exports = { listPublic, listAll, createFaq, updateFaq, deleteFaq };
