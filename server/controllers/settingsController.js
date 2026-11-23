const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// GET /api/settings  (public — frontend needs this to show platform name, logo, etc.)
const getSettings = asyncHandler(async (req, res) => {
  const result = await query('SELECT key, value FROM site_settings ORDER BY key');

  const settings = {};
  for (const row of result.rows) {
    try { settings[row.key] = JSON.parse(row.value); }
    catch { settings[row.key] = row.value; }
  }

  res.json({ success: true, data: settings });
});

// PUT /api/settings  (admin only)
// Body: { platform_name: "...", contact_email: "...", ... }
const updateSettings = asyncHandler(async (req, res) => {
  const allowed = [
    'platform_name', 'platform_tagline', 'contact_email', 'contact_phone',
    'contact_address', 'logo_url', 'favicon_url', 'hero_title', 'hero_subtitle',
    'hero_image_url', 'footer_text', 'facebook_url', 'twitter_url',
    'whatsapp_number', 'about_text', 'primary_color', 'currency_default',
    'stats_use_mock', 'mock_total_students', 'mock_total_courses',
    'mock_certificates_issued', 'mock_total_teachers',
    'certificate_serial_next', 'certificate_serial_padding',
    'certificate_director_name', 'certificate_director_title', 'certificate_academy_name'
  ];

  const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  if (!updates.length) throw createError('No valid settings keys provided.');

  for (const [key, value] of updates) {
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    await query(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, val]
    );
  }

  res.json({ success: true, message: `${updates.length} setting(s) updated.` });
});

// PUT /api/settings/logo  (admin — upload logo)
const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw createError('No file uploaded.');
  const url = `/uploads/images/${req.file.filename}`;

  await query(
    `INSERT INTO site_settings (key, value) VALUES ('logo_url', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [url]
  );

  res.json({ success: true, message: 'Logo updated.', url });
});

module.exports = { getSettings, updateSettings, uploadLogo };
