const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { sendSignupWelcomeEmail } = require('../services/emailService');
const { logEvent } = require('../services/growthService');

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  const result = await query(
    'SELECT id, full_name, display_name, email, password_hash, role, is_active, is_approved, profile_photo, bio FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  if (!result.rows.length) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const user = result.rows[0];

  if (!user.is_active) {
    return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // Subscribers (registered but not yet granted a course) can't log in to a dashboard yet.
  if (user.role === 'student' && user.is_approved === false) {
    return res.status(403).json({
      success: false,
      message: "You're registered for our updates! To access a course, contact us with this email and we'll unlock your dashboard."
    });
  }

  // Update last login
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        profile_photo: user.profile_photo,
        bio: user.bio
      }
    }
  });
});

// POST /api/auth/register — public student signup (no course access until admin grants)
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { full_name, email, password, phone, referral_code } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length) {
    throw createError('An account with this email already exists. Try signing in.', 409);
  }

  const password_hash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  const ownReferralCode = id.replace(/-/g, '').slice(0, 8).toUpperCase();

  let referrerId = null;
  if (referral_code) {
    const ref = await query('SELECT id FROM users WHERE referral_code = $1', [referral_code.trim().toUpperCase()]);
    if (ref.rows.length) referrerId = ref.rows[0].id;
  }

  // New public sign-ups are subscribers only (is_approved = FALSE):
  // they receive newsletters/announcements but get no dashboard access
  // until an admin grants them a course.
  const result = await query(
    `INSERT INTO users (id, full_name, email, password_hash, role, phone, referral_code, referred_by, is_approved)
     VALUES ($1, $2, $3, $4, 'student', $5, $6, $7, FALSE)
     RETURNING id, full_name, email, role, phone, profile_photo`,
    [id, full_name.trim(), normalizedEmail, password_hash, phone?.trim() || null, ownReferralCode, referrerId]
  );

  if (referrerId) {
    await query(
      `INSERT INTO referrals (id, referrer_id, referred_user_id, status)
       VALUES ($1, $2, $3, 'pending') ON CONFLICT (referred_user_id) DO NOTHING`,
      [uuidv4(), referrerId, id]
    );
  }

  const user = result.rows[0];

  sendSignupWelcomeEmail({
    email: user.email,
    fullName: user.full_name,
    loginUrl: `${process.env.FRONTEND_URL || ''}/student`
  }).catch(() => {});

  logEvent({ userId: id, type: 'signup' }).catch(() => {});

  // No token issued — subscribers don't get dashboard access yet.
  // They must contact us to be granted a course, which approves them.
  res.status(201).json({
    success: true,
    message: "We're happy to have you! You'll now get our updates, new courses and special offers by email. To start a course, contact us with this email and we'll unlock it for you.",
    data: {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email
      }
    }
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.id, u.full_name, u.display_name, u.email, u.role, u.phone, u.bio,
            u.profile_photo, u.social_facebook, u.social_linkedin, u.social_instagram, u.social_tiktok,
            u.is_active, u.last_login, u.created_at
     FROM users u WHERE u.id = $1`,
    [req.user.id]
  );

  res.json({ success: true, data: result.rows[0] });
});

// PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    throw createError('current_password and new_password are required.');
  }
  if (new_password.length < 8) {
    throw createError('New password must be at least 8 characters.');
  }

  const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];

  const match = await bcrypt.compare(current_password, user.password_hash);
  if (!match) throw createError('Current password is incorrect.', 401);

  const newHash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

  res.json({ success: true, message: 'Password changed successfully.' });
});

// PUT /api/auth/profile
const normalizeSocialUrl = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const updateProfile = asyncHandler(async (req, res) => {
  const {
    full_name, display_name, phone, bio,
    social_facebook, social_linkedin, social_instagram, social_tiktok
  } = req.body;
  const photo = req.file ? `/uploads/images/${req.file.filename}` : undefined;

  const fields = [];
  const values = [];
  let i = 1;

  if (full_name) { fields.push(`full_name = $${i++}`); values.push(full_name); }
  if (display_name !== undefined) {
    fields.push(`display_name = $${i++}`);
    values.push(display_name?.trim() || null);
  }
  if (phone !== undefined) { fields.push(`phone = $${i++}`); values.push(phone); }
  if (bio !== undefined) { fields.push(`bio = $${i++}`); values.push(bio?.trim() || null); }
  if (social_facebook !== undefined) { fields.push(`social_facebook = $${i++}`); values.push(normalizeSocialUrl(social_facebook)); }
  if (social_linkedin !== undefined) { fields.push(`social_linkedin = $${i++}`); values.push(normalizeSocialUrl(social_linkedin)); }
  if (social_instagram !== undefined) { fields.push(`social_instagram = $${i++}`); values.push(normalizeSocialUrl(social_instagram)); }
  if (social_tiktok !== undefined) { fields.push(`social_tiktok = $${i++}`); values.push(normalizeSocialUrl(social_tiktok)); }
  if (photo) { fields.push(`profile_photo = $${i++}`); values.push(photo); }

  if (!fields.length) {
    return res.status(400).json({ success: false, message: 'No fields to update.' });
  }

  fields.push(`updated_at = NOW()`);
  values.push(req.user.id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}
     RETURNING id, full_name, display_name, email, role, phone, bio, profile_photo,
               social_facebook, social_linkedin, social_instagram, social_tiktok`,
    values
  );

  res.json({ success: true, message: 'Profile updated.', data: result.rows[0] });
});

module.exports = { login, register, getMe, changePassword, updateProfile };
