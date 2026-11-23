const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// GET /api/me/referral  — student's referral code, link, stats, and reward coupons
const myReferral = asyncHandler(async (req, res) => {
  const me = await query('SELECT referral_code FROM users WHERE id = $1', [req.user.id]);
  let code = me.rows[0]?.referral_code;

  // Backfill a code if somehow missing.
  if (!code) {
    code = req.user.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    await query('UPDATE users SET referral_code = $2 WHERE id = $1', [req.user.id, code]);
  }

  const stats = await query(
    `SELECT
        COUNT(*) AS total_referred,
        COUNT(*) FILTER (WHERE status IN ('qualified','rewarded')) AS qualified,
        COUNT(*) FILTER (WHERE status = 'rewarded') AS rewarded
     FROM referrals WHERE referrer_id = $1`,
    [req.user.id]
  );

  const list = await query(
    `SELECT r.status, r.created_at, r.qualified_at, u.full_name AS referred_name
     FROM referrals r JOIN users u ON r.referred_user_id = u.id
     WHERE r.referrer_id = $1 ORDER BY r.created_at DESC`,
    [req.user.id]
  );

  const base = process.env.FRONTEND_URL || '';
  res.json({
    success: true,
    data: {
      referral_code: code,
      referral_link: `${base}/register?ref=${code}`,
      stats: stats.rows[0],
      referrals: list.rows,
    },
  });
});

// GET /api/me/credits  — unused account credits (wallet)
const myCredits = asyncHandler(async (req, res) => {
  const list = await query(
    `SELECT id, amount, currency, reason, source, created_at
     FROM account_credits WHERE user_id = $1 AND is_used = FALSE
     ORDER BY created_at DESC`,
    [req.user.id]
  );
  const total = list.rows.reduce((s, c) => s + Number(c.amount), 0);
  res.json({ success: true, data: { total: Math.round(total * 100) / 100, credits: list.rows } });
});

// GET /api/admin/referrals  — admin overview
const adminReferrals = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT r.id, r.status, r.created_at, r.qualified_at,
            ref.full_name AS referrer_name, ref.email AS referrer_email,
            u.full_name AS referred_name, u.email AS referred_email,
            c.code AS reward_code
     FROM referrals r
     JOIN users ref ON r.referrer_id = ref.id
     JOIN users u ON r.referred_user_id = u.id
     LEFT JOIN coupons c ON r.reward_coupon_id = c.id
     ORDER BY r.created_at DESC`
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { myReferral, myCredits, adminReferrals };
