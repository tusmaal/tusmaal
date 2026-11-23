const fs = require('fs');
const path = require('path');
const { StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const fontsDir = [
  path.join(process.cwd(), 'assets', 'fonts'),
  path.join(__dirname, '..', '..', 'assets', 'fonts'),
].find(dir => fs.existsSync(dir)) || path.join(process.cwd(), 'backend', 'assets', 'fonts');

const FONT_CANDIDATES = {
  script: ['name-script.ttf', 'name-script.otf'],
  regular: ['body-regular.ttf', 'body-regular.otf'],
  bold: ['body-bold.ttf', 'body-bold.otf'],
};

const readFirstFont = keys => {
  for (const filename of keys) {
    const filepath = path.join(fontsDir, filename);
    if (fs.existsSync(filepath)) return fs.readFileSync(filepath);
  }
  return null;
};

const embedCustomOrStandard = async (pdfDoc, keys, standard) => {
  const bytes = readFirstFont(keys);
  if (bytes) {
    try {
      return await pdfDoc.embedFont(bytes, { subset: true });
    } catch {
      console.warn(`Certificate font could not load (${keys.join(', ')}), using fallback.`);
    }
  }
  return pdfDoc.embedFont(standard);
};

const loadCertificateFonts = async pdfDoc => {
  pdfDoc.registerFontkit(fontkit);
  const [script, regular, bold] = await Promise.all([
    embedCustomOrStandard(pdfDoc, FONT_CANDIDATES.script, StandardFonts.HelveticaOblique),
    embedCustomOrStandard(pdfDoc, FONT_CANDIDATES.regular, StandardFonts.Helvetica),
    embedCustomOrStandard(pdfDoc, FONT_CANDIDATES.bold, StandardFonts.HelveticaBold),
  ]);
  return { script, regular, bold };
};

const listAvailableFonts = () => {
  if (!fs.existsSync(fontsDir)) return [];
  return fs.readdirSync(fontsDir).filter(f => /\.(ttf|otf)$/i.test(f));
};

module.exports = {
  loadCertificateFonts,
  listAvailableFonts,
  FONT_CANDIDATES,
  fontsDir,
};
