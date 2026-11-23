const rateLimit = require('express-rate-limit');

// The app trusts the platform proxy (Vercel). Skip the library's trust-proxy throw.
const validate = { trustProxy: false, xForwardedForHeader: false };

// Strict limiter for login — prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate
});

// Upload limiter — videos/PDFs are heavy
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { success: false, message: 'Upload limit reached. Try again later.' },
  validate
});

module.exports = { loginLimiter, apiLimiter, uploadLimiter };
