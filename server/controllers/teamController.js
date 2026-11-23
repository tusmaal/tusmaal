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

const normalizeSocialUrl = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const SOCIAL_FIELDS = ['social_facebook', 'social_linkedin', 'social_instagram', 'social_tiktok'];

const socialSelect = SOCIAL_FIELDS.join(', ');

// GET /api/team  (public)
const listPublic = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, full_name, role, bio, photo, order_index, ${socialSelect}
     FROM team_members
     WHERE is_published = TRUE
     ORDER BY order_index ASC, created_at ASC`
  );
  res.json({ success: true, data: result.rows });
});

// GET /api/admin/team
const listAll = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, full_name, role, bio, photo, order_index, is_published, ${socialSelect}, created_at, updated_at
     FROM team_members
     ORDER BY order_index ASC, created_at ASC`
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/admin/team
const createMember = asyncHandler(async (req, res) => {
  const { full_name, role, bio, order_index, is_published } = req.body;
  if (!full_name?.trim()) throw createError('Name is required.');
  if (!role?.trim()) throw createError('Role is required.');

  const photo = req.file ? `/uploads/images/${req.file.filename}` : null;

  const result = await query(
    `INSERT INTO team_members (
       id, full_name, role, bio, photo, order_index, is_published, created_by,
       social_facebook, social_linkedin, social_instagram, social_tiktok
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      uuidv4(),
      full_name.trim(),
      role.trim(),
      bio?.trim() || null,
      photo,
      parseOrder(order_index),
      parseBool(is_published, true),
      req.user.id,
      normalizeSocialUrl(req.body.social_facebook),
      normalizeSocialUrl(req.body.social_linkedin),
      normalizeSocialUrl(req.body.social_instagram),
      normalizeSocialUrl(req.body.social_tiktok),
    ]
  );

  res.status(201).json({ success: true, message: 'Team member added.', data: result.rows[0] });
});

// PUT /api/admin/team/:id
const updateMember = asyncHandler(async (req, res) => {
  const { full_name, role, bio, order_index, is_published } = req.body;
  const photo = req.file ? `/uploads/images/${req.file.filename}` : undefined;

  const existing = await query('SELECT id FROM team_members WHERE id = $1', [req.params.id]);
  if (!existing.rows.length) throw createError('Team member not found.', 404);

  const fields = [];
  const values = [];
  let i = 1;

  if (full_name !== undefined) { fields.push(`full_name = $${i++}`); values.push(full_name.trim()); }
  if (role !== undefined) { fields.push(`role = $${i++}`); values.push(role.trim()); }
  if (bio !== undefined) { fields.push(`bio = $${i++}`); values.push(bio?.trim() || null); }
  if (order_index !== undefined) { fields.push(`order_index = $${i++}`); values.push(parseOrder(order_index)); }
  if (is_published !== undefined) { fields.push(`is_published = $${i++}`); values.push(parseBool(is_published, true)); }
  if (photo) { fields.push(`photo = $${i++}`); values.push(photo); }

  for (const key of SOCIAL_FIELDS) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(normalizeSocialUrl(req.body[key]));
    }
  }

  if (!fields.length) throw createError('No fields to update.');

  fields.push('updated_at = NOW()');
  values.push(req.params.id);

  const result = await query(
    `UPDATE team_members SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );

  res.json({ success: true, message: 'Team member updated.', data: result.rows[0] });
});

// DELETE /api/admin/team/:id
const deleteMember = asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM team_members WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) throw createError('Team member not found.', 404);
  res.json({ success: true, message: 'Team member removed.' });
});

module.exports = { listPublic, listAll, createMember, updateMember, deleteMember };
