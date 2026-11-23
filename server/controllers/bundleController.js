const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { EXPIRES_INTERVAL_SQL, scaActivePlain } = require('../utils/courseAccess');

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 280) + '-' + Math.random().toString(36).slice(2, 6);

// ─── BUNDLES ───────────────────────────────────────────────────────────────

// GET /api/bundles  (public — active bundles with their courses)
const listBundles = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT b.*,
            COALESCE(json_agg(json_build_object('id', c.id, 'title', c.title, 'slug', c.slug, 'price', c.price, 'thumbnail', c.thumbnail))
              FILTER (WHERE c.id IS NOT NULL), '[]') AS courses,
            COALESCE(SUM(c.price), 0) AS courses_total_value
     FROM bundles b
     LEFT JOIN bundle_courses bc ON bc.bundle_id = b.id
     LEFT JOIN courses c ON bc.course_id = c.id
     ${req.user?.role === 'admin' ? '' : 'WHERE b.is_active = TRUE'}
     GROUP BY b.id
     ORDER BY b.created_at DESC`
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/admin/bundles  body: { title, description, price, course_ids: [] }
const createBundle = asyncHandler(async (req, res) => {
  const { title, description, price = 0, currency = 'USD', thumbnail, course_ids = [] } = req.body;
  if (!title || !title.trim()) throw createError('Bundle title is required.');

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const b = await client.query(
      `INSERT INTO bundles (id, title, slug, description, thumbnail, price, currency, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuidv4(), title.trim(), slugify(title), description || null, thumbnail || null, price, currency, req.user.id]
    );
    for (const cid of course_ids) {
      await client.query(
        `INSERT INTO bundle_courses (bundle_id, course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [b.rows[0].id, cid]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: b.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// PUT /api/admin/bundles/:id  (also replaces course list if course_ids provided)
const updateBundle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, price, currency, thumbnail, is_active, course_ids } = req.body;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bundles SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         price = COALESCE($4, price),
         currency = COALESCE($5, currency),
         thumbnail = COALESCE($6, thumbnail),
         is_active = COALESCE($7, is_active)
       WHERE id = $1`,
      [id, title, description, price, currency, thumbnail, is_active]
    );
    if (Array.isArray(course_ids)) {
      await client.query('DELETE FROM bundle_courses WHERE bundle_id = $1', [id]);
      for (const cid of course_ids) {
        await client.query('INSERT INTO bundle_courses (bundle_id, course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, cid]);
      }
    }
    await client.query('COMMIT');
    const out = await query('SELECT * FROM bundles WHERE id = $1', [id]);
    res.json({ success: true, data: out.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// DELETE /api/admin/bundles/:id
const deleteBundle = asyncHandler(async (req, res) => {
  await query('DELETE FROM bundles WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Bundle deleted.' });
});

// POST /api/admin/bundles/:id/grant  body: { student_id }
// Grants the student access to every course in the bundle.
const grantBundleAccess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { student_id } = req.body;
  if (!student_id) throw createError('student_id is required.');

  const courses = await query('SELECT course_id FROM bundle_courses WHERE bundle_id = $1', [id]);
  if (!courses.rows.length) throw createError('Bundle has no courses.', 400);

  for (const row of courses.rows) {
    await query(
      `INSERT INTO student_course_access (id, student_id, course_id, granted_by, notes, expires_at)
       VALUES ($1,$2,$3,$4,'Bundle grant', NOW() + ${EXPIRES_INTERVAL_SQL})
       ON CONFLICT (student_id, course_id) DO UPDATE SET is_active = TRUE, revoked_at = NULL,
         expires_at = NOW() + ${EXPIRES_INTERVAL_SQL}`,
      [uuidv4(), student_id, row.course_id, req.user.id]
    );
  }
  res.json({ success: true, message: `Access granted to ${courses.rows.length} course(s).` });
});

// ─── SUBSCRIPTION PLANS ──────────────────────────────────────────────────

// GET /api/subscription-plans  (public)
const listPlans = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT * FROM subscription_plans ${req.user?.role === 'admin' ? '' : 'WHERE is_active = TRUE'} ORDER BY price ASC`
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/admin/subscription-plans
const createPlan = asyncHandler(async (req, res) => {
  const { name, description, price = 0, currency = 'USD', interval = 'monthly', duration_days = 30 } = req.body;
  if (!name) throw createError('Plan name is required.');
  const result = await query(
    `INSERT INTO subscription_plans (id, name, description, price, currency, interval, duration_days)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [uuidv4(), name, description || null, price, currency, interval, duration_days]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// POST /api/admin/students/:studentId/subscription  body: { plan_id }
// Manually activate an all-access subscription for a student (after payment).
const grantSubscription = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { plan_id } = req.body;
  const plan = await query('SELECT * FROM subscription_plans WHERE id = $1', [plan_id]);
  if (!plan.rows.length) throw createError('Plan not found.', 404);

  const expires = new Date();
  expires.setDate(expires.getDate() + Number(plan.rows[0].duration_days || 30));

  // Expire any current active subscription, then add the new one.
  await query(`UPDATE subscriptions SET status = 'expired' WHERE student_id = $1 AND status = 'active'`, [studentId]);
  const result = await query(
    `INSERT INTO subscriptions (id, student_id, plan_id, status, expires_at, granted_by)
     VALUES ($1,$2,$3,'active',$4,$5) RETURNING *`,
    [uuidv4(), studentId, plan_id, expires, req.user.id]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// GET /api/me/subscription  (student — their active subscription if any)
const mySubscription = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT s.*, p.name AS plan_name, p.interval
     FROM subscriptions s LEFT JOIN subscription_plans p ON s.plan_id = p.id
     WHERE s.student_id = $1 AND s.status = 'active' AND s.expires_at > NOW()
     ORDER BY s.expires_at DESC LIMIT 1`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows[0] || null });
});

module.exports = {
  listBundles, createBundle, updateBundle, deleteBundle, grantBundleAccess,
  listPlans, createPlan, grantSubscription, mySubscription,
};
