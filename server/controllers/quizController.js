const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { scaActivePlain } = require('../utils/courseAccess');

// GET /api/quizzes?course_id=... — list quizzes for a course
const listQuizzes = asyncHandler(async (req, res) => {
  const { course_id } = req.query;
  if (!course_id) throw createError('course_id is required.');

  if (req.user.role === 'teacher') {
    const owns = await query(
      'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
      [course_id, req.user.id]
    );
    if (!owns.rows.length) throw createError('Course not found or access denied.', 403);
  } else if (req.user.role === 'student') {
    const access = await query(
      `SELECT id FROM student_course_access
       WHERE student_id = $1 AND course_id = $2 AND ${scaActivePlain()}`,
      [req.user.id, course_id]
    );
    if (!access.rows.length) throw createError('You do not have access to this course.', 403);
  }

  const result = await query(
    `SELECT q.id, q.title, q.description, q.pass_score, q.time_limit_minutes, q.max_attempts,
            q.created_at,
            COUNT(qq.id)::int AS questions_count
     FROM quizzes q
     LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
     WHERE q.course_id = $1
     GROUP BY q.id
     ORDER BY q.created_at DESC`,
    [course_id]
  );

  res.json({ success: true, data: result.rows });
});

// POST /api/quizzes — teacher creates a quiz
const createQuiz = asyncHandler(async (req, res) => {
  const { lesson_id, course_id, title, description, pass_score, time_limit_minutes, max_attempts, questions } = req.body;

  if (!course_id || !title) throw createError('course_id and title are required.');

  const quizId = uuidv4();
  const result = await query(
    `INSERT INTO quizzes (id, lesson_id, course_id, title, description, pass_score, time_limit_minutes, max_attempts)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [quizId, lesson_id || null, course_id, title, description, pass_score || 70, time_limit_minutes || null, max_attempts || 3]
  );

  // Insert questions if provided
  if (questions && questions.length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await query(
        `INSERT INTO quiz_questions (id, quiz_id, question, question_type, options, correct_answer, points, order_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuidv4(), quizId, q.question, q.question_type || 'mcq',
         JSON.stringify(q.options || []), q.correct_answer, q.points || 1, i]
      );
    }
  }

  res.status(201).json({ success: true, data: result.rows[0] });
});

// GET /api/quizzes/:quizId — get quiz (teacher sees answers, student doesn't)
const getQuiz = asyncHandler(async (req, res) => {
  const quiz = await query('SELECT * FROM quizzes WHERE id = $1', [req.params.quizId]);
  if (!quiz.rows.length) throw createError('Quiz not found.', 404);

  const questions = await query(
    `SELECT id, question, question_type, options, order_index, points
     ${req.user.role !== 'student' ? ', correct_answer' : ''}
     FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index`,
    [req.params.quizId]
  );

  res.json({ success: true, data: { ...quiz.rows[0], questions: questions.rows } });
});

// POST /api/quizzes/:quizId/submit — student submits quiz answers
const submitQuiz = asyncHandler(async (req, res) => {
  const { answers } = req.body; // { question_id: selected_answer }
  const studentId = req.user.id;
  const { quizId } = req.params;

  const quiz = await query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
  if (!quiz.rows.length) throw createError('Quiz not found.', 404);
  const quizData = quiz.rows[0];

  // Check attempt count
  const attempts = await query(
    'SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
    [quizId, studentId]
  );
  if (parseInt(attempts.rows[0].count) >= quizData.max_attempts) {
    throw createError(`Maximum attempts (${quizData.max_attempts}) reached.`);
  }

  // Get correct answers and calculate score
  const questions = await query('SELECT * FROM quiz_questions WHERE quiz_id = $1', [quizId]);
  let score = 0;
  let totalPoints = 0;

  const gradedAnswers = questions.rows.map(q => {
    totalPoints += q.points;
    const studentAnswer = answers[q.id];
    const isCorrect = studentAnswer?.toString().toLowerCase().trim() === q.correct_answer?.toString().toLowerCase().trim();
    if (isCorrect) score += q.points;
    return { question_id: q.id, student_answer: studentAnswer, correct_answer: q.correct_answer, is_correct: isCorrect };
  });

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passed = percentage >= quizData.pass_score;
  const attemptNumber = parseInt(attempts.rows[0].count) + 1;

  const attempt = await query(
    `INSERT INTO quiz_attempts (id, quiz_id, student_id, answers, score, total_points, percentage, passed, attempt_number, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *`,
    [uuidv4(), quizId, studentId, JSON.stringify(gradedAnswers), score, totalPoints, percentage, passed, attemptNumber]
  );

  res.json({
    success: true,
    data: {
      ...attempt.rows[0],
      graded_answers: gradedAnswers,
      pass_score: quizData.pass_score
    }
  });
});

// GET /api/quizzes/:quizId/results — student's attempt history
const getQuizResults = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, score, total_points, percentage, passed, attempt_number, submitted_at
     FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2 ORDER BY attempt_number`,
    [req.params.quizId, req.user.id]
  );
  res.json({ success: true, data: result.rows });
});

module.exports = { listQuizzes, createQuiz, getQuiz, submitQuiz, getQuizResults };
