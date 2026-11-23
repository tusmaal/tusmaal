/**
 * Upload Service
 * Currently uses local disk storage.
 * To switch to Cloudinary: set USE_CLOUDINARY=true in .env
 * and add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 */

const path = require('path');
const fs = require('fs');

// ─── LOCAL STORAGE (default) ──────────────────────────────────────────────

const getFileUrl = (filename, type = 'images') => {
  if (!filename) return null;
  return `/uploads/${type}/${filename}`;
};

const deleteLocalFile = (filePath) => {
  if (!filePath) return;
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// ─── CLOUDINARY (swap in when ready) ─────────────────────────────────────
/*
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath, folder = 'elearning') => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'auto',
  });
  return result.secure_url;
};

const deleteFromCloudinary = async (publicId) => {
  await cloudinary.uploader.destroy(publicId);
};
*/

// ─── UNIFIED INTERFACE ────────────────────────────────────────────────────

const processUpload = async (file, folder = 'images') => {
  if (!file) return null;

  if (process.env.USE_CLOUDINARY === 'true') {
    // Swap to Cloudinary path when ready
    // return await uploadToCloudinary(file.path, folder);
    throw new Error('Cloudinary not configured yet.');
  }

  // Local: return the relative URL
  return getFileUrl(file.filename, folder);
};

const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  if (process.env.USE_CLOUDINARY === 'true') {
    // const publicId = extractPublicId(fileUrl);
    // await deleteFromCloudinary(publicId);
    return;
  }

  deleteLocalFile(fileUrl);
};

// Get folder type from mimetype
const getFolderFromMime = (mimetype) => {
  if (mimetype?.startsWith('video/')) return 'videos';
  if (mimetype === 'application/pdf') return 'pdfs';
  return 'images';
};

module.exports = { processUpload, deleteFile, getFileUrl, getFolderFromMime };
