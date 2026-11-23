const multer = require('multer');
const path = require('path');
const fs = require('fs');

function resolveUploadRoot() {
  if (process.env.UPLOAD_DIR) {
    return path.isAbsolute(process.env.UPLOAD_DIR)
      ? process.env.UPLOAD_DIR
      : path.join(process.cwd(), process.env.UPLOAD_DIR);
  }
  // Vercel serverless disk is read-only except /tmp. Those files do not persist
  // across requests — set Cloudinary (or another store) for production uploads.
  if (process.env.VERCEL) return path.join('/tmp', 'uploads');
  return path.join(process.cwd(), 'uploads');
}

const UPLOAD_ROOT = resolveUploadRoot();

['videos', 'pdfs', 'images', 'assignments'].forEach(dir => {
  const fullPath = path.join(UPLOAD_ROOT, dir);
  try {
    fs.mkdirSync(fullPath, { recursive: true });
  } catch (err) {
    console.warn('Upload directory was not created:', fullPath, err.message);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'images';
    if (file.mimetype.startsWith('video/')) subDir = 'videos';
    else if (file.mimetype === 'application/pdf') subDir = 'pdfs';
    cb(null, path.join(UPLOAD_ROOT, subDir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
    cb(null, `${Date.now()}-${baseName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg',
    'application/pdf'
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 }
});

module.exports = upload;
module.exports.UPLOAD_ROOT = UPLOAD_ROOT;
