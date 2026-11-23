const { v4: uuidv4 } = require('uuid');
const Mux = require('@mux/mux-node');
const { query, getClient } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const muxClient = process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET
  ? new Mux({ tokenId: process.env.MUX_TOKEN_ID, tokenSecret: process.env.MUX_TOKEN_SECRET })
  : null;

const syncPendingMuxLessons = async (courseId) => {
  if (!muxClient) return;

  const pending = await query(
    `SELECT id, mux_upload_id, mux_asset_id, mux_status
     FROM lessons
     WHERE course_id = $1
       AND content_type = 'video'
       AND COALESCE(mux_status, 'uploading') IN ('uploading', 'processing')
       AND (mux_upload_id IS NOT NULL OR mux_asset_id IS NOT NULL)
     LIMIT 20`,
    [courseId]
  );

  for (const lesson of pending.rows) {
    try {
      let assetId = lesson.mux_asset_id || null;
      if (!assetId && lesson.mux_upload_id) {
        const upload = await muxClient.video.uploads.retrieve(lesson.mux_upload_id);
        assetId = upload.asset_id || null;
        if (assetId) {
          await query(
            `UPDATE lessons SET mux_asset_id = $2, mux_status = 'processing', updated_at = NOW() WHERE id = $1`,
            [lesson.id, assetId]
          );
        }
      }

      if (!assetId) continue;

      const asset = await muxClient.video.assets.retrieve(assetId);
      const status = asset.status;
      if (status === 'ready') {
        const playbackId = asset.playback_ids?.[0]?.id || null;
        const duration = asset.duration ? Math.round(asset.duration) : null;
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
          [lesson.id, assetId, playbackId, duration]
        );
      } else if (status === 'errored') {
        await query(
          `UPDATE lessons
           SET mux_status = 'failed',
               mux_error = 'Mux processing failed.',
               updated_at = NOW()
           WHERE id = $1`,
          [lesson.id]
        );
      } else if (status === 'preparing') {
        await query(
          `UPDATE lessons SET mux_status = 'processing', updated_at = NOW() WHERE id = $1`,
          [lesson.id]
        );
      }
    } catch {
      // Ignore individual sync failures to avoid blocking section loads.
    }
  }
};

// ─── PUBLIC / CATALOG ──────────────────────────────────────────────────────

// GET /api/courses — public catalog
const getCourses = asyncHandler(async (req, res) => {
  const { category, level, search, page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;

  let conditions = ['c.is_published = TRUE'];
  const values = [];
  let i = 1;

  if (category) { conditions.push(`cat.name ILIKE $${i++}`); values.push(category); }
  if (level) { conditions.push(`c.level = $${i++}`); values.push(level); }
  if (search) {
    conditions.push(`(c.title ILIKE $${i} OR c.description ILIKE $${i})`);
    values.push(`%${search}%`); i++;
  }

  const where = conditions.join(' AND ');
  const total = (await query(`SELECT COUNT(*) FROM courses c LEFT JOIN categories cat ON c.category_id = cat.id WHERE ${where}`, values)).rows[0].count;

  const result = await query(
    `SELECT c.id, c.title, c.slug, c.description, c.thumbnail, c.price, c.currency,
            c.language, c.level, c.duration_hours, c.total_students,
            cat.name AS category, u.full_name AS teacher_name, u.profile_photo AS teacher_photo
     FROM courses c
     LEFT JOIN categories cat ON c.category_id = cat.id
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE ${where}
     ORDER BY c.is_featured DESC, c.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: { total: parseInt(total), page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
  });
});

// GET /api/courses/:slug — single course detail (public)
const getCourse = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.*, cat.name AS category, u.full_name AS teacher_name,
            u.profile_photo AS teacher_photo, u.bio AS teacher_bio
     FROM courses c
     LEFT JOIN categories cat ON c.category_id = cat.id
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE c.slug = $1 AND c.is_published = TRUE`,
    [req.params.slug]
  );
  if (!result.rows.length) throw createError('Course not found.', 404);

  const course = result.rows[0];

  // Get sections with lessons (public preview)
  const sections = await query(
    `SELECT s.id, s.title, s.order_index,
            json_agg(
              json_build_object(
                'id', l.id, 'title', l.title, 'content_type', l.content_type,
                'duration_minutes', l.duration_minutes, 'order_index', l.order_index,
                'is_preview', l.is_preview
              ) ORDER BY l.order_index
            ) AS lessons
     FROM sections s
     LEFT JOIN lessons l ON l.section_id = s.id
     WHERE s.course_id = $1
     GROUP BY s.id ORDER BY s.order_index`,
    [course.id]
  );

  course.sections = sections.rows;
  res.json({ success: true, data: course });
});

// ─── TEACHER: CREATE & MANAGE COURSES ─────────────────────────────────────

// GET /api/courses/my — teacher's own courses
const getMyCourses = asyncHandler(async (req, res) => {
  const teacherId = req.user.role === 'admin' ? req.query.teacher_id || null : req.user.id;

  let cond = teacherId ? 'c.teacher_id = $1' : '1=1';
  const vals = teacherId ? [teacherId] : [];

  const result = await query(
    `SELECT c.id, c.title, c.slug, c.thumbnail, c.is_published, c.course_status,
            c.review_comment, c.price, c.total_students, c.level, c.created_at,
            c.submitted_for_review_at, c.reviewed_at, cat.name AS category
     FROM courses c
     LEFT JOIN categories cat ON c.category_id = cat.id
     WHERE ${cond}
     ORDER BY c.created_at DESC`,
    vals
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/courses
const createCourse = asyncHandler(async (req, res) => {
  const { title, description, price, currency, language, level, category_id, duration_hours } = req.body;

  if (!title) throw createError('Course title is required.');

  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) + '-' + Date.now();

  const thumbnail = req.file ? `/uploads/images/${req.file.filename}` : null;
  const teacherId = req.user.role === 'teacher' ? req.user.id : (req.body.teacher_id || null);

  const result = await query(
    `INSERT INTO courses (id, title, slug, description, thumbnail, price, currency, language, level, category_id, teacher_id, duration_hours, is_published, course_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,FALSE,'draft')
     RETURNING *`,
    [uuidv4(), title, slug, description, thumbnail, price || 0, currency || 'USD',
     language || 'Somali', level || 'beginner', category_id || null, teacherId, duration_hours || 0]
  );

  res.status(201).json({ success: true, message: 'Course created.', data: result.rows[0] });
});

// PUT /api/courses/:id
const updateCourse = asyncHandler(async (req, res) => {
  const { title, description, price, language, level, category_id, duration_hours, is_published, is_featured, course_status } = req.body;
  const thumbnail = req.file ? `/uploads/images/${req.file.filename}` : undefined;

  // Check ownership
  const existing = await query('SELECT teacher_id FROM courses WHERE id = $1', [req.params.id]);
  if (!existing.rows.length) throw createError('Course not found.', 404);
  if (req.user.role === 'teacher' && existing.rows[0].teacher_id !== req.user.id) {
    throw createError('You can only edit your own courses.', 403);
  }

  const fields = [];
  const values = [];
  let i = 1;
  const add = (col, val) => { if (val !== undefined) { fields.push(`${col} = $${i++}`); values.push(val); } };

  add('title', title);
  add('description', description);
  add('price', price);
  add('language', language);
  add('level', level);
  add('category_id', category_id);
  add('duration_hours', duration_hours);
  if (req.user.role === 'admin') {
    add('is_published', is_published);
    add('is_featured', is_featured);
    add('course_status', course_status);
  } else {
    // Any teacher edit returns the course to draft (unless it is already pending review).
    if (fields.length > 0) {
      add('course_status', 'draft');
      add('is_published', false);
      add('review_comment', null);
      add('reviewed_at', null);
      add('reviewed_by', null);
    }
  }
  add('thumbnail', thumbnail);

  if (!fields.length) throw createError('Nothing to update.');
  fields.push(`updated_at = NOW()`);
  values.push(req.params.id);

  const result = await query(
    `UPDATE courses SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );

  res.json({ success: true, message: 'Course updated.', data: result.rows[0] });
});

// POST /api/courses/:id/submit-review
const submitForReview = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const existing = await query('SELECT id, teacher_id, course_status FROM courses WHERE id = $1', [courseId]);
  if (!existing.rows.length) throw createError('Course not found.', 404);

  const course = existing.rows[0];
  if (req.user.role === 'teacher' && course.teacher_id !== req.user.id) {
    throw createError('You can only submit your own courses.', 403);
  }

  if (course.course_status === 'pending_review') {
    throw createError('This course is already pending review.');
  }

  const result = await query(
    `UPDATE courses
     SET course_status = 'pending_review',
         is_published = FALSE,
         submitted_for_review_at = NOW(),
         review_comment = NULL,
         reviewed_at = NULL,
         reviewed_by = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [courseId]
  );

  res.json({ success: true, message: 'Course submitted for admin review.', data: result.rows[0] });
});

// GET /api/admin/courses/review
const getReviewQueue = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const values = [];
  let i = 1;
  const conditions = ['1=1'];

  if (status && ['draft', 'pending_review', 'published', 'rejected'].includes(status)) {
    conditions.push(`c.course_status = $${i++}`);
    values.push(status);
  }

  if (search) {
    conditions.push(`(c.title ILIKE $${i} OR u.full_name ILIKE $${i})`);
    values.push(`%${search}%`);
    i++;
  }

  const result = await query(
    `SELECT c.id, c.title, c.slug, c.thumbnail, c.level, c.price, c.is_published,
            c.course_status, c.review_comment, c.submitted_for_review_at,
            c.reviewed_at, c.updated_at, cat.name AS category,
            u.id AS teacher_id, u.full_name AS teacher_name, u.email AS teacher_email
     FROM courses c
     LEFT JOIN categories cat ON c.category_id = cat.id
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       CASE c.course_status
         WHEN 'pending_review' THEN 1
         WHEN 'rejected' THEN 2
         WHEN 'draft' THEN 3
         ELSE 4
       END,
       c.submitted_for_review_at DESC NULLS LAST,
       c.updated_at DESC`,
    values
  );

  res.json({ success: true, data: result.rows });
});

// PUT /api/admin/courses/:id/review
const reviewCourse = asyncHandler(async (req, res) => {
  const { action, comment } = req.body;
  const courseId = req.params.id;

  const exists = await query('SELECT id, course_status FROM courses WHERE id = $1', [courseId]);
  if (!exists.rows.length) throw createError('Course not found.', 404);

  if (action === 'pending_review') {
    const result = await query(
      `UPDATE courses
       SET course_status = 'pending_review',
           is_published = FALSE,
           submitted_for_review_at = COALESCE(submitted_for_review_at, NOW()),
           review_comment = NULL,
           reviewed_at = NOW(),
           reviewed_by = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [courseId, req.user.id]
    );
    return res.json({ success: true, message: 'Course moved to pending review.', data: result.rows[0] });
  }

  if (action === 'publish') {
    const result = await query(
      `UPDATE courses
       SET course_status = 'published',
           is_published = TRUE,
           review_comment = NULL,
           reviewed_at = NOW(),
           reviewed_by = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [courseId, req.user.id]
    );
    return res.json({ success: true, message: 'Course approved and published.', data: result.rows[0] });
  }

  if (!comment || !comment.trim()) {
    throw createError('Please include a rejection comment for the teacher.');
  }

  const result = await query(
    `UPDATE courses
     SET course_status = 'rejected',
         is_published = FALSE,
         review_comment = $2,
         reviewed_at = NOW(),
         reviewed_by = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [courseId, comment.trim(), req.user.id]
  );

  res.json({ success: true, message: 'Course rejected with feedback sent to teacher.', data: result.rows[0] });
});

// DELETE /api/courses/:id
const deleteCourse = asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM courses WHERE id = $1 RETURNING id, title', [req.params.id]);
  if (!result.rows.length) throw createError('Course not found.', 404);
  res.json({ success: true, message: 'Course deleted.' });
});

// ─── SECTIONS ─────────────────────────────────────────────────────────────

// GET /api/courses/:courseId/sections
const getSections = asyncHandler(async (req, res) => {
  await syncPendingMuxLessons(req.params.courseId);

  const sections = await query(
    `SELECT s.id, s.title, s.description, s.order_index,
            json_agg(
              json_build_object(
                'id', l.id, 'title', l.title, 'content_type', l.content_type,
                'duration_minutes', l.duration_minutes, 'order_index', l.order_index,
                'is_preview', l.is_preview, 'video_url', l.video_url,
                'youtube_url', l.youtube_url, 'pdf_url', l.pdf_url,
                'mux_upload_id', l.mux_upload_id, 'mux_asset_id', l.mux_asset_id,
                'mux_playback_id', l.mux_playback_id, 'mux_status', l.mux_status,
                'mux_duration_seconds', l.mux_duration_seconds, 'mux_error', l.mux_error
              ) ORDER BY l.order_index
            ) FILTER (WHERE l.id IS NOT NULL) AS lessons
     FROM sections s
     LEFT JOIN lessons l ON l.section_id = s.id
     WHERE s.course_id = $1
     GROUP BY s.id ORDER BY s.order_index`,
    [req.params.courseId]
  );
  res.json({ success: true, data: sections.rows });
});

// POST /api/courses/:courseId/sections
const createSection = asyncHandler(async (req, res) => {
  const { title, description, order_index } = req.body;
  if (!title) throw createError('Section title is required.');

  const result = await query(
    `INSERT INTO sections (id, course_id, title, description, order_index)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [uuidv4(), req.params.courseId, title, description, order_index || 0]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// PUT /api/courses/:courseId/sections/:sectionId
const updateSection = asyncHandler(async (req, res) => {
  const { title, description, order_index } = req.body;
  const result = await query(
    `UPDATE sections SET title = COALESCE($1, title), description = COALESCE($2, description),
     order_index = COALESCE($3, order_index) WHERE id = $4 AND course_id = $5 RETURNING *`,
    [title, description, order_index, req.params.sectionId, req.params.courseId]
  );
  if (!result.rows.length) throw createError('Section not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/courses/:courseId/sections/:sectionId
const deleteSection = asyncHandler(async (req, res) => {
  await query('DELETE FROM sections WHERE id = $1 AND course_id = $2', [req.params.sectionId, req.params.courseId]);
  res.json({ success: true, message: 'Section deleted.' });
});

// ─── LESSONS ──────────────────────────────────────────────────────────────

// POST /api/courses/:courseId/sections/:sectionId/lessons
const createLesson = asyncHandler(async (req, res) => {
  const { title, content_type, youtube_url, text_content, duration_minutes, order_index, is_preview } = req.body;
  if (!title || !content_type) throw createError('title and content_type are required.');

  const videoUrl = req.files?.video ? `/uploads/videos/${req.files.video[0].filename}` : null;
  const pdfUrl = req.files?.pdf ? `/uploads/pdfs/${req.files.pdf[0].filename}` : null;

  const result = await query(
    `INSERT INTO lessons (id, section_id, course_id, title, content_type, video_url, youtube_url,
     pdf_url, text_content, duration_minutes, order_index, is_preview)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [uuidv4(), req.params.sectionId, req.params.courseId, title, content_type,
     videoUrl, youtube_url, pdfUrl, text_content, duration_minutes || 0, order_index || 0, is_preview || false]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// PUT /api/courses/:courseId/lessons/:lessonId
const updateLesson = asyncHandler(async (req, res) => {
  const { title, content_type, youtube_url, text_content, duration_minutes, order_index, is_preview } = req.body;
  const result = await query(
    `UPDATE lessons SET
      title = COALESCE($1, title), content_type = COALESCE($2, content_type),
      youtube_url = COALESCE($3, youtube_url), text_content = COALESCE($4, text_content),
      duration_minutes = COALESCE($5, duration_minutes), order_index = COALESCE($6, order_index),
      is_preview = COALESCE($7, is_preview), updated_at = NOW()
     WHERE id = $8 AND course_id = $9 RETURNING *`,
    [title, content_type, youtube_url, text_content, duration_minutes, order_index, is_preview,
     req.params.lessonId, req.params.courseId]
  );
  if (!result.rows.length) throw createError('Lesson not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/courses/:courseId/lessons/:lessonId
const deleteLesson = asyncHandler(async (req, res) => {
  await query('DELETE FROM lessons WHERE id = $1 AND course_id = $2', [req.params.lessonId, req.params.courseId]);
  res.json({ success: true, message: 'Lesson deleted.' });
});

module.exports = {
  getCourses, getCourse, getMyCourses, createCourse, updateCourse, deleteCourse,
  getSections, createSection, updateSection, deleteSection,
  createLesson, updateLesson, deleteLesson,
  submitForReview, getReviewQueue, reviewCourse
};
