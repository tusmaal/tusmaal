const Mux = require('@mux/mux-node');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
  webhookSecret: process.env.MUX_WEBHOOK_SECRET
});

const ensureMuxConfigured = () => {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    throw createError('Mux is not configured on the server.', 500);
  }
};

// POST /api/videos/lessons/:lessonId/upload-url
const createLessonUploadUrl = asyncHandler(async (req, res) => {
  ensureMuxConfigured();
  const { lessonId } = req.params;

  const lessonResult = await query(
    `SELECT l.id, l.course_id, c.teacher_id
     FROM lessons l
     JOIN courses c ON l.course_id = c.id
     WHERE l.id = $1`,
    [lessonId]
  );
  if (!lessonResult.rows.length) throw createError('Lesson not found.', 404);

  const lesson = lessonResult.rows[0];
  if (req.user.role === 'teacher' && lesson.teacher_id !== req.user.id) {
    throw createError('You can only upload videos for your own lessons.', 403);
  }

  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      // 'basic' quality = $0 encoding + cheaper storage, still adaptive 1080p.
      // No downloadable MP4/master (good for paid course content).
      video_quality: 'basic',
      passthrough: JSON.stringify({ lessonId })
    },
    cors_origin: process.env.FRONTEND_URL || '*'
  });

  await query(
    `UPDATE lessons
     SET mux_upload_id = $2,
         mux_status = 'uploading',
         mux_error = NULL,
         video_url = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [lessonId, upload.id]
  );

  res.status(201).json({
    success: true,
    data: {
      upload_id: upload.id,
      upload_url: upload.url,
      timeout: upload.timeout
    }
  });
});

// POST /api/videos/webhook/mux (raw body route in server.js)
const handleMuxWebhook = async (req, res) => {
  try {
    const raw = req.body;
    const signature = req.headers['mux-signature'];
    let event;

    if (process.env.MUX_WEBHOOK_SECRET && signature) {
      // Verified path — throws if the signature does not match.
      event = mux.webhooks.unwrap(raw, req.headers, process.env.MUX_WEBHOOK_SECRET);
    } else if (process.env.NODE_ENV === 'production') {
      // In production we refuse to trust unsigned/unverifiable webhooks.
      console.warn('[Mux webhook] Rejected: missing signature or MUX_WEBHOOK_SECRET in production.');
      return res.status(401).json({ success: false, message: 'Unsigned webhook rejected.' });
    } else {
      // Local/dev convenience only.
      event = JSON.parse(Buffer.isBuffer(raw) ? raw.toString('utf8') : raw);
    }

    // Asset created from upload
    if (event.type === 'video.upload.asset_created') {
      const uploadId = event.data?.id;
      const assetId = event.data?.asset_id;
      if (uploadId && assetId) {
        await query(
          `UPDATE lessons
           SET mux_asset_id = $2,
               mux_status = 'processing',
               updated_at = NOW()
           WHERE mux_upload_id = $1`,
          [uploadId, assetId]
        );
      }
    }

    // Asset ready with playback id
    if (event.type === 'video.asset.ready') {
      const assetId = event.data?.id;
      const playbackId = event.data?.playback_ids?.[0]?.id || null;
      const duration = event.data?.duration ? Math.round(event.data.duration) : null;
      const passthrough = event.data?.passthrough;

      let lessonId = null;
      if (passthrough) {
        try {
          lessonId = JSON.parse(passthrough).lessonId || null;
        } catch {
          lessonId = null;
        }
      }

      if (lessonId) {
        await query(
          `UPDATE lessons
           SET mux_asset_id = $2,
               mux_playback_id = $3,
               mux_duration_seconds = $4,
               mux_status = 'ready',
               mux_error = NULL,
               video_url = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [lessonId, assetId, playbackId, duration]
        );
      } else if (assetId) {
        await query(
          `UPDATE lessons
           SET mux_playback_id = $2,
               mux_duration_seconds = $3,
               mux_status = 'ready',
               mux_error = NULL,
               video_url = NULL,
               updated_at = NOW()
           WHERE mux_asset_id = $1`,
          [assetId, playbackId, duration]
        );
      }
    }

    // Asset processing failed
    if (event.type === 'video.asset.errored') {
      const assetId = event.data?.id;
      const errorMsg = event.data?.errors?.messages?.join(', ') || 'Mux processing failed.';
      if (assetId) {
        await query(
          `UPDATE lessons
           SET mux_status = 'failed',
               mux_error = $2,
               updated_at = NOW()
           WHERE mux_asset_id = $1`,
          [assetId, errorMsg]
        );
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Invalid webhook payload.' });
  }
};

// POST /api/videos/lessons/:lessonId/reconcile
// Fallback when a webhook was missed: ask Mux directly and update the lesson.
// Fixes the "stuck on uploading/processing" failure mode.
const reconcileLesson = asyncHandler(async (req, res) => {
  ensureMuxConfigured();
  const { lessonId } = req.params;

  const lessonRes = await query(
    `SELECT l.id, l.mux_upload_id, l.mux_asset_id, l.mux_status, c.teacher_id
     FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1`,
    [lessonId]
  );
  if (!lessonRes.rows.length) throw createError('Lesson not found.', 404);
  const lesson = lessonRes.rows[0];
  if (req.user.role === 'teacher' && lesson.teacher_id !== req.user.id) {
    throw createError('You can only manage your own lessons.', 403);
  }

  // Resolve asset id from the upload if we only have the upload id.
  let assetId = lesson.mux_asset_id;
  if (!assetId && lesson.mux_upload_id) {
    try {
      const upload = await mux.video.uploads.retrieve(lesson.mux_upload_id);
      assetId = upload.asset_id || null;
      if (assetId) {
        await query(`UPDATE lessons SET mux_asset_id = $2, updated_at = NOW() WHERE id = $1`, [lessonId, assetId]);
      }
    } catch (e) { /* upload not found / not ready yet */ }
  }

  if (!assetId) {
    return res.json({ success: true, data: { mux_status: lesson.mux_status, message: 'No asset yet — still uploading.' } });
  }

  const asset = await mux.video.assets.retrieve(assetId);
  const playbackId = asset.playback_ids?.[0]?.id || null;
  const duration = asset.duration ? Math.round(asset.duration) : null;
  const status = asset.status === 'ready' ? 'ready' : (asset.status === 'errored' ? 'failed' : 'processing');

  await query(
    `UPDATE lessons SET mux_asset_id = $2, mux_playback_id = $3, mux_duration_seconds = $4,
       mux_status = $5, mux_error = $6, updated_at = NOW() WHERE id = $1`,
    [lessonId, assetId, playbackId, duration, status,
     status === 'failed' ? (asset.errors?.messages?.join(', ') || 'Mux processing failed.') : null]
  );

  res.json({ success: true, data: { mux_status: status, mux_playback_id: playbackId, duration_seconds: duration } });
});

module.exports = { createLessonUploadUrl, handleMuxWebhook, reconcileLesson };
