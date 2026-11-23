const nodemailer = require('nodemailer');

// Create transporter — configure via .env
const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port,
    // Port 465 uses implicit SSL; 587 uses STARTTLS
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const FROM = `"${process.env.PLATFORM_NAME || 'Tusmaal'}" <${process.env.SMTP_USER}>`;

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────

const PLATFORM = process.env.PLATFORM_NAME || 'Tusmaal';
const SITE_URL = process.env.FRONTEND_URL || '#';

const baseTemplate = (body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #ffffff; padding: 22px 32px; text-align: center; border-bottom: 4px solid #15184b; }
    .header img { width: 200px; height: auto; display: block; margin: 0 auto; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .btn { display: inline-block; margin: 20px 0; padding: 12px 28px; background: #ff9d00; color: #15184b; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .footer { background: #f0f0f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #888; }
    .highlight { background: #eef0ff; border-left: 4px solid #15184b; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><img src="${SITE_URL}/ResourcesPhotos/tusmaal.png" alt="${PLATFORM}" width="200"></div>
    <div class="body">${body}</div>
    <div class="footer">© ${new Date().getFullYear()} ${PLATFORM}. All rights reserved.</div>
  </div>
</body>
</html>`;

// ─── PREMIUM BROADCAST TEMPLATES ──────────────────────────────────────────
// Table-based, inline-styled, bulletproof — renders cleanly in Gmail, Apple
// Mail, Outlook, etc. Minimal, high-contrast, generous whitespace.

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = '#16151f';
const MUTED = '#6b7280';

// Bulletproof CTA button.
const button = (label, url, color = '#15184b') => {
  const text = /^#f/i.test(color) ? '#15184b' : '#ffffff';
  return `
  <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:4px 0;">
    <tr><td align="center" bgcolor="${color}" style="border-radius:12px;">
      <a href="${url}" target="_blank"
         style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:${text};text-decoration:none;border-radius:12px;letter-spacing:.2px;">${label}</a>
    </td></tr>
  </table>`;
};

// Small uppercase eyebrow label.
const eyebrow = (text, color) =>
  `<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${color};margin:0 0 12px;">${text}</div>`;

// Premium course card.
const courseCard = (course, ctaLabel, ctaColor) => {
  if (!course) return '';
  const img = course.thumbnail && /^https?:\/\//i.test(course.thumbnail)
    ? `<img src="${course.thumbnail}" alt="${course.title}" width="536" style="width:100%;display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">`
    : `<div style="height:8px;background:linear-gradient(90deg,#15184b,#ff9d00);"></div>`;
  const price = Number(course.price) > 0 ? `$${Number(course.price)}` : 'Free';
  const meta = [course.level, course.duration_hours ? `${course.duration_hours} hours` : null].filter(Boolean).join('  ·  ');
  return `
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"
           style="border:1px solid #ececf0;border-radius:16px;overflow:hidden;margin:8px 0 4px;">
      <tr><td style="font-size:0;line-height:0;">${img}</td></tr>
      <tr><td style="padding:22px 24px;font-family:${FONT};">
        <div style="font-size:19px;font-weight:700;color:${INK};line-height:1.3;margin:0 0 6px;">${course.title}</div>
        ${meta ? `<div style="font-size:13px;color:${MUTED};text-transform:capitalize;margin:0 0 14px;">${meta}</div>` : '<div style="height:6px;"></div>'}
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr>
          <td align="left" style="font-family:${FONT};font-size:20px;font-weight:800;color:${INK};">${price}</td>
          <td align="right">${button(ctaLabel, `${SITE_URL}/courses/${course.slug}`, ctaColor)}</td>
        </tr></table>
      </td></tr>
    </table>`;
};

// Outer shell — clean logo header, white card, refined footer with unsubscribe.
const broadcastShell = (content, unsubscribeUrl) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <title>${PLATFORM}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;-webkit-font-smoothing:antialiased;">
  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background:#f4f4f7;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;max-width:600px;">
        <!-- Logo -->
        <tr><td align="center" style="padding:4px 0 26px;font-family:${FONT};">
          <img src="${SITE_URL}/ResourcesPhotos/tusmaal.png" alt="${PLATFORM}" width="200" style="display:block;width:200px;height:auto;border:0;">
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#ffffff;border:1px solid #ececf0;border-radius:20px;overflow:hidden;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding:26px 24px 8px;font-family:${FONT};color:#9aa0aa;font-size:12px;line-height:1.7;">
          <div style="font-weight:700;color:#6b7280;margin-bottom:4px;">${PLATFORM}</div>
          <div>Learn in your language. Anytime, anywhere.</div>
          <div style="margin-top:12px;">
            <a href="${SITE_URL}/courses" style="color:#9aa0aa;text-decoration:none;">Courses</a> &nbsp;·&nbsp;
            <a href="${unsubscribeUrl}" style="color:#9aa0aa;text-decoration:underline;">Unsubscribe</a>
          </div>
          <div style="margin-top:10px;">© ${new Date().getFullYear()} ${PLATFORM}. All rights reserved.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// Content padding wrapper.
const contentWrap = (inner) =>
  `<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr>
     <td style="padding:40px;font-family:${FONT};color:#3a3a46;font-size:16px;line-height:1.75;">${inner}</td>
   </tr></table>`;

const heroTitle = (title) =>
  `<h1 style="margin:0 0 18px;font-family:${FONT};font-size:30px;line-height:1.2;font-weight:800;color:${INK};letter-spacing:-0.5px;">${title}</h1>`;

const divider = `<div style="height:1px;background:#ececf0;margin:32px 0;line-height:1px;font-size:0;">&nbsp;</div>`;

// Thin accent stripe at the top of the card.
const accentStripe = (color) => `<div style="height:5px;background:${color};line-height:5px;font-size:0;">&nbsp;</div>`;

// Builds the full inner card HTML (accent stripe + padded content) for a campaign type.
const buildCampaignContent = ({ type, subject, bodyHtml, course, coupon }) => {
  const title = subject || PLATFORM;

  if (type === 'course_announcement') {
    const inner =
      eyebrow('New Course', '#ff9d00') +
      heroTitle(title) +
      `<p style="margin:0 0 24px;color:${MUTED};font-size:16px;">A brand-new course just landed — here's what you can start learning today.</p>` +
      courseCard(course, 'View Course', '#15184b') +
      divider +
      `<div style="color:#3a3a46;">${bodyHtml}</div>`;
    return accentStripe('#ff9d00') + contentWrap(inner);
  }

  if (type === 'discount_announcement') {
    const offer = coupon
      ? (coupon.discount_type === 'percent' ? `Save ${parseFloat(coupon.discount_value)}%` : `Save $${parseFloat(coupon.discount_value)}`)
      : 'Special offer';
    const expiry = coupon && coupon.expires_at
      ? `<div style="font-family:${FONT};font-size:13px;color:#b45309;margin-top:12px;">Offer ends ${new Date(coupon.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>`
      : '';
    const codeBox = coupon ? `
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin:8px 0 28px;">
        <tr><td align="center"
            style="background:#fff8ec;border:1px solid #fde3b3;border-radius:16px;padding:26px 24px;font-family:${FONT};">
          <div style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b45309;">${offer}</div>
          <div style="font-size:13px;color:${MUTED};margin:6px 0 14px;">Use this code at checkout</div>
          <div style="display:inline-block;background:#ffffff;border:2px dashed #f59e0b;border-radius:12px;padding:14px 30px;font-size:24px;font-weight:800;letter-spacing:3px;color:${INK};">${coupon.code}</div>
          ${expiry}
        </td></tr>
      </table>` : '';
    const inner =
      eyebrow('Limited-time offer', '#f59e0b') +
      heroTitle(title) +
      codeBox +
      courseCard(course, 'Enroll Now', '#ff9d00') +
      divider +
      `<div style="color:#3a3a46;">${bodyHtml}</div>`;
    return accentStripe('#f59e0b') + contentWrap(inner);
  }

  // default: newsletter
  const inner =
    eyebrow('Newsletter', '#ff9d00') +
    heroTitle(title) +
    `<div style="color:#3a3a46;">${bodyHtml}</div>` +
    divider +
    `<div style="text-align:center;">${button('Browse Courses', `${SITE_URL}/courses`, '#15184b')}</div>`;
  return accentStripe('#15184b') + contentWrap(inner);
};

// ─── SEND FUNCTIONS ───────────────────────────────────────────────────────

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[Email skipped — SMTP not configured] To: ${to} | Subject: ${subject}`);
    return { skipped: true };
  }
  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`[Email sent] To: ${to} | Subject: ${subject}`);
    return result;
  } catch (err) {
    console.error(`[Email failed] To: ${to} | Error: ${err.message}`);
    return { error: err.message };
  }
};

// Welcome email when a student signs up themselves (no password in email)
const sendSignupWelcomeEmail = async ({ email, fullName, loginUrl }) => {
  const html = baseTemplate(`
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>Welcome to <strong>${PLATFORM}</strong>! Your free account is ready.</p>
    <div class="highlight">
      Browse our course catalog anytime. When you're ready to enroll in a paid course,
      contact our team — we'll unlock your courses after payment.
    </div>
    <p>We'll also email you when new courses launch and special offers are available.</p>
    <a href="${loginUrl || process.env.FRONTEND_URL + '/student'}" class="btn">Go to My Dashboard</a>
    <p>Questions? Reply to this email or message us on WhatsApp.</p>
  `);
  return sendEmail({ to: email, subject: `Welcome to ${PLATFORM} — account created!`, html });
};

// Welcome email when admin creates a student account
const sendWelcomeEmail = async ({ email, fullName, password, loginUrl }) => {
  const html = baseTemplate(`
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>Your account on <strong>${PLATFORM}</strong> has been created. You can now log in and start learning!</p>
    <div class="highlight">
      <strong>Your Login Details:</strong><br>
      Email: <code>${email}</code><br>
      Password: <code>${password}</code>
    </div>
    <p>Please change your password after your first login.</p>
    <a href="${loginUrl || process.env.FRONTEND_URL + '/login'}" class="btn">Login Now</a>
    <p>If you have any questions, contact our admin team.</p>
  `);
  return sendEmail({ to: email, subject: `Welcome to ${PLATFORM}!`, html });
};

// Notify student that they've been enrolled in a course
const sendEnrollmentEmail = async ({ email, fullName, courseName, teacherName }) => {
  const html = baseTemplate(`
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>You have been successfully enrolled in a new course!</p>
    <div class="highlight">
      <strong>Course:</strong> ${courseName}<br>
      <strong>Instructor:</strong> ${teacherName || 'Platform Instructor'}
    </div>
    <p>Log in to your account to start learning. Your course access is valid for <strong>6 months</strong> from today.</p>
    <a href="${process.env.FRONTEND_URL || '#'}/student/courses" class="btn">Go to My Courses</a>
  `);
  return sendEmail({ to: email, subject: `You're enrolled: ${courseName}`, html });
};

// Notify student their assignment was graded
const sendGradeEmail = async ({ email, fullName, assignmentTitle, grade, maxGrade, feedback }) => {
  const html = baseTemplate(`
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>Your assignment has been graded!</p>
    <div class="highlight">
      <strong>Assignment:</strong> ${assignmentTitle}<br>
      <strong>Your Grade:</strong> ${grade} / ${maxGrade}<br>
      ${feedback ? `<strong>Feedback:</strong> ${feedback}` : ''}
    </div>
    <a href="${process.env.FRONTEND_URL || '#'}/student/courses" class="btn">View My Progress</a>
  `);
  return sendEmail({ to: email, subject: `Assignment graded: ${assignmentTitle}`, html });
};

// Send certificate issued notification
const sendCertificateEmail = async ({ email, fullName, courseName, certificateNumber, downloadUrl }) => {
  const html = baseTemplate(`
    <p>Congratulations <strong>${fullName}</strong>! 🎉</p>
    <p>You have successfully completed the course <strong>"${courseName}"</strong> and earned your certificate!</p>
    <div class="highlight">
      <strong>Certificate Number:</strong> ${certificateNumber}
    </div>
    <a href="${downloadUrl || process.env.FRONTEND_URL + '/student/certificates'}" class="btn">Download Certificate</a>
    <p>Keep up the great work and continue learning!</p>
  `);
  return sendEmail({ to: email, subject: `Certificate earned: ${courseName} 🎓`, html });
};

// Password reset by admin
const sendPasswordResetEmail = async ({ email, fullName, newPassword }) => {
  const html = baseTemplate(`
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>Your password has been reset by the administrator.</p>
    <div class="highlight">
      <strong>New Password:</strong> <code>${newPassword}</code>
    </div>
    <p>Please login and change your password immediately.</p>
    <a href="${process.env.FRONTEND_URL || '#'}/login" class="btn">Login Now</a>
  `);
  return sendEmail({ to: email, subject: 'Your password has been reset', html });
};

// Broadcast / newsletter email — wraps the pre-built campaign content in the
// professional branded shell, which ALWAYS includes a compliant unsubscribe link.
const sendBroadcastEmail = async ({ to, subject, bodyHtml, unsubscribeUrl }) => {
  const html = broadcastShell(bodyHtml, unsubscribeUrl);
  return sendEmail({ to, subject, html });
};

// Re-engagement nudge — student inactive for a few days (Duolingo-style)
const sendStreakReminder = async ({ email, fullName, daysInactive, currentStreak, courseName }) => {
  const streakLine = currentStreak > 0
    ? `<p>Your <strong>${currentStreak}-day streak 🔥</strong> is waiting for you — don't let it slip!</p>`
    : `<p>A few minutes today is all it takes to get back on track.</p>`;
  const html = baseTemplate(`
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>We haven't seen you in ${daysInactive} day${daysInactive === 1 ? '' : 's'}. ${courseName ? `Your course <strong>"${courseName}"</strong> is right where you left it.` : ''}</p>
    ${streakLine}
    <div class="highlight">Just one lesson today keeps your momentum going. 💪</div>
    <a href="${process.env.FRONTEND_URL || '#'}/student" class="btn">Continue Learning</a>
  `);
  return sendEmail({ to: email, subject: `${fullName.split(' ')[0]}, keep your learning streak alive! 🔥`, html });
};

module.exports = {
  sendSignupWelcomeEmail, sendWelcomeEmail, sendEnrollmentEmail,
  sendGradeEmail, sendCertificateEmail, sendPasswordResetEmail,
  sendStreakReminder, sendEmail, sendBroadcastEmail, baseTemplate, buildCampaignContent, broadcastShell
};
