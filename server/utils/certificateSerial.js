const { pool } = require('../config/database');

const parseSettingValue = raw => {
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
};

const getSetting = async (client, key, fallback) => {
  const result = await client.query('SELECT value FROM site_settings WHERE key = $1', [key]);
  const v = parseSettingValue(result.rows[0]?.value);
  return v == null || v === '' ? fallback : v;
};

const formatSerial = (num, padding = 5) => String(num).padStart(padding, '0');

/** Allocate the next certificate serial inside a transaction (pass a pg client). */
const allocateCertificateNumber = async (client) => {
  await client.query(
    `INSERT INTO site_settings (key, value) VALUES ('certificate_serial_next', '8')
     ON CONFLICT (key) DO NOTHING`
  );

  const locked = await client.query(
    `SELECT value FROM site_settings WHERE key = 'certificate_serial_next' FOR UPDATE`
  );
  const padding = Number(await getSetting(client, 'certificate_serial_padding', 5)) || 5;
  let next = parseInt(parseSettingValue(locked.rows[0]?.value), 10);
  if (!Number.isFinite(next) || next < 1) next = 1;

  const serial = formatSerial(next, padding);

  await client.query(
    `UPDATE site_settings SET value = $1, updated_at = NOW() WHERE key = 'certificate_serial_next'`,
    [JSON.stringify(next + 1)]
  );

  return serial;
};

const DEFAULT_PDF_SETTINGS = {
  directorName: 'Amin Ahmed Abdi',
  directorTitle: 'Academic Director',
  academyName: 'Aqoonjire Academy',
};

const getCertificatePdfSettings = async () => {
  try {
    const client = await pool.connect();
    try {
      const [directorName, directorTitle, academyName] = await Promise.all([
        getSetting(client, 'certificate_director_name', DEFAULT_PDF_SETTINGS.directorName),
        getSetting(client, 'certificate_director_title', DEFAULT_PDF_SETTINGS.directorTitle),
        getSetting(client, 'certificate_academy_name', DEFAULT_PDF_SETTINGS.academyName),
      ]);
      return { directorName, directorTitle, academyName };
    } finally {
      client.release();
    }
  } catch {
    return { ...DEFAULT_PDF_SETTINGS };
  }
};

module.exports = {
  allocateCertificateNumber,
  getCertificatePdfSettings,
  formatSerial,
  parseSettingValue,
  DEFAULT_PDF_SETTINGS,
};
