const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const parseBool = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === '1';
};

const parseOrder = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fileUrl = (file, subdir) => (file ? `/uploads/${subdir}/${file.filename}` : null);

// GET /api/alumni  (public — admin-curated success stories)
const listAlumni = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, full_name, company, photo, story_pdf, order_index
     FROM alumni_spotlights
     WHERE is_published = TRUE
     ORDER BY order_index ASC, created_at ASC`
  );
  res.json({ success: true, data: result.rows });
});

// GET /api/admin/alumni
const listAll = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, full_name, company, photo, story_pdf, order_index, is_published, created_at, updated_at
     FROM alumni_spotlights
     ORDER BY order_index ASC, created_at ASC`
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/admin/alumni
const createSpotlight = asyncHandler(async (req, res) => {
  const { full_name, company, order_index, is_published } = req.body;
  if (!full_name?.trim()) throw createError('Name is required.');
  if (!company?.trim()) throw createError('Company is required.');

  const storyPdf = fileUrl(req.files?.story_pdf?.[0], 'pdfs');
  if (!storyPdf) throw createError('Success story PDF is required.');

  const photo = fileUrl(req.files?.photo?.[0], 'images');

  const result = await query(
    `INSERT INTO alumni_spotlights (id, full_name, company, photo, story_pdf, order_index, is_published, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      uuidv4(),
      full_name.trim(),
      company.trim(),
      photo,
      storyPdf,
      parseOrder(order_index),
      parseBool(is_published, true),
      req.user.id,
    ]
  );

  res.status(201).json({ success: true, message: 'Alumni spotlight added.', data: result.rows[0] });
});

// PUT /api/admin/alumni/:id
const updateSpotlight = asyncHandler(async (req, res) => {
  const { full_name, company, order_index, is_published } = req.body;
  const photo = fileUrl(req.files?.photo?.[0], 'images');
  const storyPdf = fileUrl(req.files?.story_pdf?.[0], 'pdfs');

  const existing = await query('SELECT id FROM alumni_spotlights WHERE id = $1', [req.params.id]);
  if (!existing.rows.length) throw createError('Alumni spotlight not found.', 404);

  const fields = [];
  const values = [];
  let i = 1;

  if (full_name !== undefined) { fields.push(`full_name = $${i++}`); values.push(full_name.trim()); }
  if (company !== undefined) { fields.push(`company = $${i++}`); values.push(company.trim()); }
  if (order_index !== undefined) { fields.push(`order_index = $${i++}`); values.push(parseOrder(order_index)); }
  if (is_published !== undefined) { fields.push(`is_published = $${i++}`); values.push(parseBool(is_published, true)); }
  if (photo) { fields.push(`photo = $${i++}`); values.push(photo); }
  if (storyPdf) { fields.push(`story_pdf = $${i++}`); values.push(storyPdf); }

  if (!fields.length) throw createError('No fields to update.');

  fields.push('updated_at = NOW()');
  values.push(req.params.id);

  const result = await query(
    `UPDATE alumni_spotlights SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );

  res.json({ success: true, message: 'Alumni spotlight updated.', data: result.rows[0] });
});

// DELETE /api/admin/alumni/:id
const deleteSpotlight = asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM alumni_spotlights WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) throw createError('Alumni spotlight not found.', 404);
  res.json({ success: true, message: 'Alumni spotlight removed.' });
});

module.exports = { listAlumni, listAll, createSpotlight, updateSpotlight, deleteSpotlight };
