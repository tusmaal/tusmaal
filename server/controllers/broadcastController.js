const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { sendBroadcastEmail, buildCampaignContent } = require('../services/emailService');
const { scaActive } = require('../utils/courseAccess');

const BATCH_SIZE = parseInt(process.env.BROADCAST_BATCH_SIZE) || 20;
const DELAY_MS = parseInt(process.env.BROADCAST_DELAY_MS) || 1500;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── AUDIENCE RESOLUTION ───────────────────────────────────────────────────
// Returns { text, values } selecting the recipients for a given audience.
// Always excludes opted-out and deactivated users.
const resolveAudience = (audience, courseId) => {
  const base = `SELECT u.id, u.full_name, u.email, u.unsubscribe_token
                FROM users u
                WHERE u.is_active = TRUE AND u.email_opt_out = FALSE`;

  switch (audience) {
    case 'all_users':
      return { text: base, values: [] };

    case 'all_students':
      return { text: `${base} AND u.role = 'student'`, values: [] };

    case 'all_teachers':
      return { text: `${base} AND u.role = 'teacher'`, values: [] };

    case 'course_students':
      if (!courseId) throw createError('course_id is required for course_students audience.');
      return {
        text: `${base} AND u.role = 'student'
               AND EXISTS (
                 SELECT 1 FROM student_course_access sca
                 WHERE sca.student_id = u.id AND sca.course_id = $1 AND ${scaActive('sca')}
               )`,
        values: [courseId]
      };

    case 'active_students':
      return {
        text: `${base} AND u.role = 'student'
               AND EXISTS (
                 SELECT 1 FROM daily_activity da
                 WHERE da.student_id = u.id AND da.activity_date >= CURRENT_DATE - INTERVAL '14 days'
               )`,
        values: []
      };

    case 'inactive_students':
      return {
        text: `${base} AND u.role = 'student'
               AND NOT EXISTS (
                 SELECT 1 FROM daily_activity da
                 WHERE da.student_id = u.id AND da.activity_date >= CURRENT_DATE - INTERVAL '14 days'
               )`,
        values: []
      };

    default:
      throw createError('Invalid audience.');
  }
};

// ─── BACKGROUND SENDER ─────────────────────────────────────────────────────
// Fire-and-forget: sends to recipients in throttled batches and tracks progress.
const runCampaign = async ({ campaignId, recipients, subject, bodyHtml }) => {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (u) => {
      try {
        const unsubscribeUrl = `${process.env.FRONTEND_URL || ''}/unsubscribe?token=${u.unsubscribe_token}`;
        const result = await sendBroadcastEmail({ to: u.email, subject, bodyHtml, unsubscribeUrl });
        if (result && result.error) failed++; else sent++;
      } catch {
        failed++;
      }
    }));

    // Persist progress after each batch so the admin UI can poll it.
    await query(
      `UPDATE email_campaigns SET sent_count = $1, failed_count = $2 WHERE id = $3`,
      [sent, failed, campaignId]
    ).catch(() => {});

    if (i + BATCH_SIZE < recipients.length) await sleep(DELAY_MS);
  }

  const finalStatus = sent === 0 && failed > 0 ? 'failed' : 'sent';
  await query(
    `UPDATE email_campaigns SET status = $1, sent_count = $2, failed_count = $3, sent_at = NOW() WHERE id = $4`,
    [finalStatus, sent, failed, campaignId]
  ).catch(() => {});
};

// ─── ENDPOINTS ─────────────────────────────────────────────────────────────

// GET /admin/broadcasts — campaign history
const listCampaigns = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ec.*, c.title AS course_title, fc.title AS feature_course_title,
            cp.code AS coupon_code, u.full_name AS created_by_name
     FROM email_campaigns ec
     LEFT JOIN courses c  ON ec.course_id = c.id
     LEFT JOIN courses fc ON ec.feature_course_id = fc.id
     LEFT JOIN coupons cp ON ec.coupon_id = cp.id
     LEFT JOIN users u    ON ec.created_by = u.id
     ORDER BY ec.created_at DESC`
  );
  res.json({ success: true, data: result.rows });
});

// POST /admin/broadcasts/preview — count recipients for an audience
const previewAudience = asyncHandler(async (req, res) => {
  const { audience, course_id } = req.body;
  const { text, values } = resolveAudience(audience, course_id);
  const result = await query(`SELECT COUNT(*) FROM (${text}) AS recipients`, values);
  res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
});

// POST /admin/broadcasts — create campaign and send in the background
const createAndSend = asyncHandler(async (req, res) => {
  const { subject, body_html, audience, course_id, coupon_id, feature_course_id } = req.body;
  const campaign_type = req.body.campaign_type || 'newsletter';

  if (!subject || !subject.trim()) throw createError('Subject is required.');
  if (!body_html || !body_html.trim()) throw createError('Message body is required.');

  // Per-type requirements: course announcements need a course;
  // discount announcements need both a course and a coupon.
  if ((campaign_type === 'course_announcement' || campaign_type === 'discount_announcement') && !feature_course_id) {
    throw createError('Select the course to feature.');
  }
  if (campaign_type === 'discount_announcement' && !coupon_id) {
    throw createError('Select the discount coupon.');
  }

  // Fetch the featured/discounted course for the email content.
  let course = null;
  if (feature_course_id) {
    const c = await query(
      `SELECT id, title, slug, thumbnail, price, level, duration_hours FROM courses WHERE id = $1`,
      [feature_course_id]
    );
    if (!c.rows.length) throw createError('Featured course not found.', 404);
    course = c.rows[0];
  }

  // Fetch the coupon for the discount banner.
  let coupon = null;
  if (coupon_id) {
    const cp = await query(
      `SELECT code, discount_type, discount_value, expires_at FROM coupons WHERE id = $1 AND is_active = TRUE`,
      [coupon_id]
    );
    if (cp.rows.length) coupon = cp.rows[0];
  }

  // Build the rich, type-specific email content once (per-recipient unsubscribe is added at send time).
  const content = buildCampaignContent({ type: campaign_type, subject: subject.trim(), bodyHtml: body_html, course, coupon });

  // Resolve recipients (audience targeting uses course_id, independent of the featured course).
  const { text, values } = resolveAudience(audience, course_id);
  const recipientsRes = await query(text, values);
  const recipients = recipientsRes.rows;

  const id = uuidv4();
  const initialStatus = recipients.length === 0 ? 'sent' : 'sending';

  await query(
    `INSERT INTO email_campaigns
       (id, subject, body_html, audience, course_id, coupon_id, campaign_type, feature_course_id, status, recipients_count, created_by, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ${recipients.length === 0 ? 'NOW()' : 'NULL'})`,
    [id, subject.trim(), content, audience, course_id || null, coupon_id || null, campaign_type, feature_course_id || null, initialStatus, recipients.length, req.user.id]
  );

  // Respond immediately — the actual sending happens in the background.
  res.status(201).json({
    success: true,
    message: recipients.length === 0
      ? 'No recipients matched this audience.'
      : `Sending to ${recipients.length} recipient(s)…`,
    data: { id, recipients_count: recipients.length, status: initialStatus }
  });

  if (recipients.length > 0) {
    runCampaign({ campaignId: id, recipients, subject: subject.trim(), bodyHtml: content })
      .catch(err => console.error(`[Broadcast ${id}] failed:`, err.message));
  }
});

// GET /admin/broadcasts/:id — poll status / progress
const getCampaign = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ec.*, c.title AS course_title, cp.code AS coupon_code
     FROM email_campaigns ec
     LEFT JOIN courses c  ON ec.course_id = c.id
     LEFT JOIN coupons cp ON ec.coupon_id = cp.id
     WHERE ec.id = $1`,
    [req.params.id]
  );
  if (!result.rows.length) throw createError('Campaign not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

// GET /unsubscribe?token=... — public, no auth
const publicUnsubscribe = asyncHandler(async (req, res) => {
  const { token } = req.query;
  let unsubscribed = false;

  if (token) {
    const result = await query(
      `UPDATE users SET email_opt_out = TRUE WHERE unsubscribe_token = $1 RETURNING id`,
      [token]
    );
    unsubscribed = result.rows.length > 0;
  }

  const page = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unsubscribe — Tusmaal</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .box{background:#fff;max-width:480px;margin:20px;padding:40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);text-align:center}
  h1{color:#15184b;font-size:22px;margin:0 0 12px}
  p{color:#555;line-height:1.6;font-size:15px}
  .ok{color:#ff9d00;font-size:40px;margin-bottom:8px}
  a{color:#ff9d00;font-weight:bold;text-decoration:none}
</style></head>
<body><div class="box">
  ${unsubscribed
    ? `<div class="ok">✓</div><h1>You've been unsubscribed</h1><p>You will no longer receive newsletters or promotional emails from Tusmaal. We're sorry to see you go.</p>`
    : `<h1>Link not valid</h1><p>This unsubscribe link is invalid or has expired. If you keep receiving emails, please contact us.</p>`}
  <p><a href="${process.env.FRONTEND_URL || '/'}">← Back to Tusmaal</a></p>
</div></body></html>`;

  res.status(200).type('html').send(page);
});

module.exports = {
  listCampaigns, previewAudience, createAndSend, getCampaign, publicUnsubscribe
};
