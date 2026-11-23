const { getClient } = require('../config/database');
const { allocateCertificateNumber, getCertificatePdfSettings } = require('../utils/certificateSerial');
const { generateCertificatePDF } = require('../utils/certificateGenerator');

/** Issue a certificate with the next serial number (transaction-safe). */
const issueCourseCertificate = async ({ studentId, courseId }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT * FROM certificates WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    if (existing.rows.length) {
      await client.query('COMMIT');
      return existing.rows[0];
    }

    const certNumber = await allocateCertificateNumber(client);

    const names = await client.query(
      `SELECT COALESCE(NULLIF(TRIM(u.display_name), ''), u.full_name) AS student_name,
              c.title AS course_title,
              t.full_name AS teacher_name
       FROM users u, courses c
       LEFT JOIN users t ON c.teacher_id = t.id
       WHERE u.id = $1 AND c.id = $2`,
      [studentId, courseId]
    );

    const certResult = await client.query(
      `INSERT INTO certificates (student_id, course_id, certificate_number)
       VALUES ($1, $2, $3) RETURNING *`,
      [studentId, courseId, certNumber]
    );

    await client.query('COMMIT');

    const cert = certResult.rows[0];
    if (names.rows.length) {
      const pdfSettings = await getCertificatePdfSettings();
      try {
        await generateCertificatePDF({
          studentName: names.rows[0].student_name,
          courseName: names.rows[0].course_title,
          teacherName: names.rows[0].teacher_name || 'Platform Instructor',
          certificateNumber: certNumber,
          issuedAt: cert.issued_at,
          academyName: pdfSettings.academyName,
          directorName: pdfSettings.directorName,
          directorTitle: pdfSettings.directorTitle,
        });
      } catch (err) {
        console.error('Certificate PDF gen error:', err.message);
      }
    }

    return cert;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { issueCourseCertificate };
