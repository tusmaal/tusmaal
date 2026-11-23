const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument, rgb } = require('pdf-lib');
const { getCertificatePdfSettings } = require('./certificateSerial');
const { layout: baseLayout } = require('./certificateLayout');
const { loadCertificateFonts } = require('./certificateFonts');

const COLORS = {
  teal: rgb(0 / 255, 184 / 255, 152 / 255),
  navy: rgb(26 / 255, 39 / 255, 68 / 255),
  muted: rgb(107 / 255, 114 / 255, 128 / 255),
};

const safeFilename = certNum => String(certNum).replace(/[^a-zA-Z0-9_-]/g, '_');

const assetsDir = [
  path.join(process.cwd(), 'assets'),
  path.join(__dirname, '..', '..', 'assets'),
].find(dir => fs.existsSync(dir)) || path.join(process.cwd(), 'backend', 'assets');

const resolveTemplatePath = () => {
  const candidates = [
    path.join(assetsDir, 'certificate-template.png'),
    path.join(assetsDir, 'certificate-template.jpg'),
    path.join(assetsDir, 'certificate-template.jpeg'),
    path.join(assetsDir, 'certificate-template.pdf'),
    path.join(assetsDir, 'certificate-template.pdf.pdf'),
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
};

const yFromTop = (yTop, pageHeight) => pageHeight - yTop;

const drawMask = (page, { x, y, w, h }, pageHeight) => {
  page.drawRectangle({
    x,
    y: yFromTop(y + h, pageHeight),
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });
};

const textWidth = (text, font, size) => font.widthOfTextAtSize(text, size);

const drawCentered = (page, text, yTop, font, size, color, pageWidth, pageHeight, maxWidth) => {
  let line = text;
  let fontSize = size;
  if (maxWidth) {
    while (fontSize > 8 && textWidth(line, font, fontSize) > maxWidth) fontSize -= 0.5;
    if (textWidth(line, font, fontSize) > maxWidth) {
      while (line.length > 10 && textWidth(`${line}…`, font, fontSize) > maxWidth) {
        line = line.slice(0, -1);
      }
      line = `${line}…`;
    }
  }
  const w = textWidth(line, font, fontSize);
  page.drawText(line, {
    x: (pageWidth - w) / 2,
    y: yFromTop(yTop, pageHeight),
    size: fontSize,
    font,
    color,
  });
};

const drawAt = (page, text, x, yTop, font, size, color, pageHeight, align = 'center') => {
  const w = textWidth(text, font, size);
  let drawX = x;
  if (align === 'center') drawX = x - w / 2;
  if (align === 'right') drawX = x - w;
  page.drawText(text, {
    x: drawX,
    y: yFromTop(yTop, pageHeight),
    size,
    font,
    color,
  });
};

const scaleLayout = (layout, pageWidth, pageHeight) => {
  const sx = pageWidth / layout.page.width;
  const sy = pageHeight / layout.page.height;
  const s = (v, axis) => Math.round(v * (axis === 'x' ? sx : sy));
  return {
    masks: layout.masks.map(m => ({ x: s(m.x, 'x'), y: s(m.y, 'y'), w: s(m.w, 'x'), h: s(m.h, 'y') })),
    name: { y: s(layout.name.y, 'y'), size: layout.name.size * sy, color: layout.name.color },
    course: { y: s(layout.course.y, 'y'), size: layout.course.size * sy, color: layout.course.color, maxWidth: s(layout.course.maxWidth, 'x') },
    date: { x: s(layout.date.x, 'x'), y: s(layout.date.y, 'y'), size: layout.date.size * sy, color: layout.date.color },
    serial: { x: s(layout.serial.x, 'x'), y: s(layout.serial.y, 'y'), size: layout.serial.size * sy, color: layout.serial.color, align: layout.serial.align || 'center' },
    qr: { x: s(layout.qr.x, 'x'), y: s(layout.qr.y, 'y'), size: s(layout.qr.size, 'x') },
  };
};

const getImageDimensions = async (filePath) => {
  const meta = await sharp(filePath).metadata();
  return { width: meta.width, height: meta.height };
};

const loadTemplateBackground = async (pdfDoc, templatePath) => {
  if (templatePath.endsWith('.png') || templatePath.endsWith('.jpg') || templatePath.endsWith('.jpeg')) {
    const imgBytes = fs.readFileSync(templatePath);
    const isJpeg = imgBytes[0] === 0xff && imgBytes[1] === 0xd8;
    const image = isJpeg ? await pdfDoc.embedJpg(imgBytes) : await pdfDoc.embedPng(imgBytes);
    const dims = await getImageDimensions(templatePath);
    return { kind: 'image', image, width: dims.width, height: dims.height };
  }

  try {
    const pdfBytes = fs.readFileSync(templatePath);
    const templateDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
    const { width, height } = templatePage.getSize();
    return { kind: 'pdf-page', page: templatePage, width, height };
  } catch {
    throw new Error(
      'Could not read certificate-template.pdf. Export it from Canva as PNG/JPG or as an unprotected PDF.'
    );
  }
};

/**
 * Generates a certificate PDF using the Tusmaal template + dynamic fields + QR.
 */
const generateCertificatePDF = async ({
  studentName,
  courseName,
  certificateNumber,
  issuedAt,
  directorName: _directorName,
  directorTitle: _directorTitle,
  academyName,
  verifyBaseUrl,
  preview = false,
}) => {
  const pdfSettings = await getCertificatePdfSettings();
  const academy = academyName || pdfSettings.academyName;
  const baseUrl = (verifyBaseUrl || process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const verifyUrl = `${baseUrl}/verify?cert=${encodeURIComponent(certificateNumber)}`;

  const certsDir = path.join(process.cwd(), 'uploads', 'certificates');
  if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

  const filename = preview ? '_preview.pdf' : `${safeFilename(certificateNumber)}.pdf`;
  const filepath = path.join(certsDir, filename);

  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 200,
    margin: 0,
    color: { dark: '#1a2744', light: '#ffffff' },
  });

  const dateStr = new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const courseLine = `Has successfully completed the online course in ${courseName} at ${academy}.`;
  const serialLine = `Certificate Serial Number: ${certificateNumber}`;

  const pdfDoc = await PDFDocument.create();
  const templatePath = resolveTemplatePath();
  if (!templatePath) {
    throw new Error('Certificate template not found in assets/. Add certificate-template.png or certificate-template.pdf');
  }

  const template = await loadTemplateBackground(pdfDoc, templatePath);
  const pageWidth = template.width;
  const pageHeight = template.height;
  const layout = scaleLayout(baseLayout, pageWidth, pageHeight);

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  if (template.kind === 'image') {
    page.drawImage(template.image, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  } else {
    const embedded = await pdfDoc.embedPage(template.page);
    page.drawPage(embedded, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  }

  const fonts = await loadCertificateFonts(pdfDoc);

  for (const mask of layout.masks) drawMask(page, mask, pageHeight);

  drawCentered(page, studentName, layout.name.y, fonts.script, layout.name.size, COLORS.teal, pageWidth, pageHeight);
  drawCentered(page, courseLine, layout.course.y, fonts.regular, layout.course.size, COLORS.navy, pageWidth, pageHeight, layout.course.maxWidth);
  drawAt(page, dateStr, layout.date.x, layout.date.y, fonts.bold, layout.date.size, COLORS.teal, pageHeight);
  drawAt(page, serialLine, layout.serial.x, layout.serial.y, fonts.regular, layout.serial.size, COLORS.navy, pageHeight, layout.serial.align);

  const qrImage = await pdfDoc.embedPng(qrBuffer);
  page.drawImage(qrImage, {
    x: layout.qr.x,
    y: yFromTop(layout.qr.y + layout.qr.size, pageHeight),
    width: layout.qr.size,
    height: layout.qr.size,
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filepath, pdfBytes);

  return { filepath, filename, url: `/uploads/certificates/${filename}`, verifyUrl };
};

const streamCertificate = (filepath, res, filename) => {
  if (!fs.existsSync(filepath)) return false;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(filepath).pipe(res);
  return true;
};

module.exports = { generateCertificatePDF, streamCertificate, safeFilename };
