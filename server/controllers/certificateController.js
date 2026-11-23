const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { generateCertificatePDF, streamCertificate, safeFilename } = require('../utils/certificateGenerator');
const { getCertificatePdfSettings } = require('../utils/certificateSerial');

const certPdfPath = certNumber => {
  const filename = `${safeFilename(certNumber)}.pdf`;
  return { filename, filepath: path.join(process.cwd(), 'uploads', 'certificates', filename) };
};

const fetchCertRow = async (whereClause, params) => {
  const result = await query(
    `SELECT cert.*,
            COALESCE(NULLIF(TRIM(u.display_name), ''), u.full_name) AS student_name,
            u.profile_photo AS student_photo,
            c.title AS course_title,
            t.full_name AS teacher_name
     FROM certificates cert
     JOIN users u ON cert.student_id = u.id
     JOIN courses c ON cert.course_id = c.id
     LEFT JOIN users t ON c.teacher_id = t.id
     WHERE ${whereClause}`,
    params
  );
  return result.rows[0] || null;
};

const buildPdf = async cert => {
  const pdfSettings = await getCertificatePdfSettings();
  return generateCertificatePDF({
    studentName: cert.student_name,
    courseName: cert.course_title,
    teacherName: cert.teacher_name || 'Platform Instructor',
    certificateNumber: cert.certificate_number,
    issuedAt: cert.issued_at,
    academyName: pdfSettings.academyName,
    directorName: pdfSettings.directorName,
    directorTitle: pdfSettings.directorTitle,
  });
};

// GET /api/certificates/:certificateId/download
const downloadCertificate = asyncHandler(async (req, res) => {
  const cert = await fetchCertRow('cert.id = $1', [req.params.certificateId]);
  if (!cert) throw createError('Certificate not found.', 404);

  if (req.user.role === 'student' && cert.student_id !== req.user.id) {
    throw createError('You can only download your own certificates.', 403);
  }

  const { filename, filepath } = certPdfPath(cert.certificate_number);
  if (!fs.existsSync(filepath)) await buildPdf(cert);

  const streamed = streamCertificate(filepath, res, filename);
  if (!streamed) throw createError('Certificate file could not be generated.', 500);
});

// GET /api/certificates/verify/:certNumber  (public)
const verifyCertificate = asyncHandler(async (req, res) => {
  const certNumber = decodeURIComponent(req.params.certNumber || '').trim();
  if (!certNumber) {
    return res.status(400).json({ success: false, valid: false, message: 'Certificate serial number is required.' });
  }

  const cert = await fetchCertRow('cert.certificate_number = $1', [certNumber]);
  if (!cert) {
    return res.status(404).json({ success: false, valid: false, message: 'Certificate not found. Please check the serial number and try again.' });
  }

  res.json({
    success: true,
    valid: true,
    data: {
      certificate_number: cert.certificate_number,
      student_name: cert.student_name,
      student_photo: cert.student_photo,
      course_title: cert.course_title,
      teacher_name: cert.teacher_name,
      issued_at: cert.issued_at,
    },
  });
});

// POST /api/certificates/regenerate/:certificateId  (admin)
const regenerateCertificate = asyncHandler(async (req, res) => {
  const cert = await fetchCertRow('cert.id = $1', [req.params.certificateId]);
  if (!cert) throw createError('Certificate not found.', 404);

  const generated = await buildPdf(cert);
  res.json({ success: true, message: 'Certificate regenerated.', url: generated.url });
});

// POST /api/admin/certificates/regenerate-all  (admin)
const regenerateAllCertificates = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT cert.id, cert.certificate_number, cert.issued_at,
            COALESCE(NULLIF(TRIM(u.display_name), ''), u.full_name) AS student_name,
            u.profile_photo AS student_photo,
            c.title AS course_title,
            t.full_name AS teacher_name
     FROM certificates cert
     JOIN users u ON cert.student_id = u.id
     JOIN courses c ON cert.course_id = c.id
     LEFT JOIN users t ON c.teacher_id = t.id
     ORDER BY cert.issued_at ASC`
  );

  let ok = 0;
  let failed = 0;
  for (const cert of rows.rows) {
    try {
      await buildPdf(cert);
      ok += 1;
    } catch {
      failed += 1;
    }
  }

  res.json({
    success: true,
    message: `Regenerated ${ok} certificate PDF(s).${failed ? ` ${failed} failed.` : ''}`,
    data: { regenerated: ok, failed, total: rows.rows.length },
  });
});

// POST /api/admin/certificates/preview  (admin — sample PDF download)
const previewCertificate = asyncHandler(async (req, res) => {
  const studentName = String(req.body.studentName || '').trim();
  const courseName = String(req.body.courseName || '').trim();
  if (!studentName || !courseName) {
    throw createError('Student name and course name are required.', 400);
  }

  const pdfSettings = await getCertificatePdfSettings();
  const certificateNumber = String(req.body.certificateNumber || '00000').trim() || '00000';

  const generated = await generateCertificatePDF({
    studentName,
    courseName,
    certificateNumber,
    issuedAt: req.body.issuedAt ? new Date(req.body.issuedAt) : new Date(),
    academyName: pdfSettings.academyName,
    directorName: pdfSettings.directorName,
    directorTitle: pdfSettings.directorTitle,
    preview: true,
  });

  const downloadName = `certificate-preview-${safeFilename(certificateNumber)}.pdf`;
  const streamed = streamCertificate(generated.filepath, res, downloadName);
  if (!streamed) throw createError('Preview certificate could not be generated.', 500);
});

module.exports = {
  downloadCertificate,
  verifyCertificate,
  regenerateCertificate,
  regenerateAllCertificates,
  previewCertificate,
};
