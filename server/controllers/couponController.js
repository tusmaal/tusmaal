const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { calcCouponDiscount } = require('../utils/pricing');

// GET /api/admin/coupons
const listCoupons = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.*, co.title AS course_title, u.full_name AS assigned_user_name
     FROM coupons c
     LEFT JOIN courses co ON c.course_id = co.id
     LEFT JOIN users u ON c.assigned_to_user = u.id
     ORDER BY c.created_at DESC`
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/admin/coupons
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code, description, discount_type = 'percent', discount_value,
    applies_to = 'all', course_id, bundle_id, min_purchase = 0,
    max_uses, per_user_limit = 1, starts_at, expires_at,
  } = req.body;

  if (!code || !code.trim()) throw createError('Coupon code is required.');
  if (discount_value == null || Number(discount_value) <= 0) throw createError('Discount value must be greater than 0.');
  if (discount_type === 'percent' && Number(discount_value) > 100) throw createError('Percent discount cannot exceed 100.');

  const result = await query(
    `INSERT INTO coupons
       (id, code, description, discount_type, discount_value, applies_to,
        course_id, bundle_id, min_purchase, max_uses, per_user_limit,
        starts_at, expires_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [uuidv4(), code.trim().toUpperCase(), description || null, discount_type, discount_value,
     applies_to, course_id || null, bundle_id || null, min_purchase || 0,
     max_uses || null, per_user_limit || 1, starts_at || null, expires_at || null, req.user.id]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// PUT /api/admin/coupons/:id
const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const fields = ['description', 'discount_type', 'discount_value', 'applies_to',
    'course_id', 'bundle_id', 'min_purchase', 'max_uses', 'per_user_limit',
    'starts_at', 'expires_at', 'is_active'];
  const sets = [];
  const vals = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { sets.push(`${f} = $${i++}`); vals.push(req.body[f]); }
  }
  if (!sets.length) throw createError('No fields to update.');
  vals.push(id);
  const result = await query(`UPDATE coupons SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals);
  if (!result.rows.length) throw createError('Coupon not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/admin/coupons/:id
const deleteCoupon = asyncHandler(async (req, res) => {
  await query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Coupon deleted.' });
});

// Shared lookup + eligibility check used by validate & redeem.
const findUsableCoupon = async (code, userId) => {
  const res = await query('SELECT * FROM coupons WHERE LOWER(code) = LOWER($1)', [code]);
  if (!res.rows.length) return { error: 'Coupon not found.' };
  const coupon = res.rows[0];

  if (coupon.assigned_to_user && coupon.assigned_to_user !== userId) {
    return { error: 'This coupon is not available for your account.' };
  }
  if (coupon.per_user_limit != null && userId) {
    const used = await query(
      'SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2',
      [coupon.id, userId]
    );
    if (Number(used.rows[0].count) >= Number(coupon.per_user_limit)) {
      return { error: 'You have already used this coupon.' };
    }
  }
  return { coupon };
};

// POST /api/coupons/validate   body: { code, amount, course_id?, bundle_id? }
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, amount = 0, course_id, bundle_id } = req.body;
  if (!code) throw createError('Coupon code is required.');

  const { coupon, error } = await findUsableCoupon(code, req.user.id);
  if (error) throw createError(error, 400);

  // Scope check
  if (coupon.applies_to === 'course' && course_id && coupon.course_id !== course_id) {
    throw createError('This coupon is not valid for this course.', 400);
  }
  if (coupon.applies_to === 'bundle' && bundle_id && coupon.bundle_id !== bundle_id) {
    throw createError('This coupon is not valid for this bundle.', 400);
  }

  const { discount, final, error: calcErr } = calcCouponDiscount(coupon, amount);
  if (calcErr) throw createError(calcErr, 400);

  res.json({
    success: true,
    data: {
      coupon_id: coupon.id, code: coupon.code, discount_type: coupon.discount_type,
      discount_value: coupon.discount_value, discount, original_amount: Number(amount), final_amount: final,
    },
  });
});

// POST /api/coupons/redeem   body: { code, amount, course_id?, bundle_id? }
// Records the redemption (used at manual-payment / checkout time).
const redeemCoupon = asyncHandler(async (req, res) => {
  const { code, amount = 0, course_id, bundle_id } = req.body;
  const { coupon, error } = await findUsableCoupon(code, req.user.id);
  if (error) throw createError(error, 400);

  const { discount, final, error: calcErr } = calcCouponDiscount(coupon, amount);
  if (calcErr) throw createError(calcErr, 400);

  await query(
    `INSERT INTO coupon_redemptions
       (id, coupon_id, user_id, course_id, bundle_id, original_amount, discount_applied, final_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [uuidv4(), coupon.id, req.user.id, course_id || null, bundle_id || null, amount, discount, final]
  );
  await query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [coupon.id]);

  res.json({ success: true, data: { discount, final_amount: final, code: coupon.code } });
});

// GET /api/me/coupons  — student's personal (assigned) coupons that are still usable
const myCoupons = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, code, description, discount_type, discount_value, expires_at, auto_source,
            (max_uses IS NOT NULL AND used_count >= max_uses) AS used
     FROM coupons
     WHERE assigned_to_user = $1 AND is_active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

module.exports = {
  listCoupons, createCoupon, updateCoupon, deleteCoupon,
  validateCoupon, redeemCoupon, myCoupons,
};
