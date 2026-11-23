/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  // Native and server-only packages stay outside the webpack bundle.
  serverExternalPackages: [
    'pg',
    'sharp',
    'bcryptjs',
    'multer',
    'busboy',
    '@mux/mux-node',
    'nodemailer',
    'qrcode',
    'pdf-lib',
    '@pdf-lib/fontkit',
    'express',
    'cors',
    'helmet',
    'morgan',
    'express-rate-limit',
    'express-validator',
    'jsonwebtoken',
  ],
  outputFileTracingIncludes: {
    '/api/[[...path]]': ['./server/**/*', './assets/**/*'],
    '/api/cron/reminders': ['./server/**/*'],
    '/health': ['./server/**/*'],
    '/uploads/[[...path]]': ['./server/**/*'],
  },
};

module.exports = nextConfig;
