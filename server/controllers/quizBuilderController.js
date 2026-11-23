const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// Helper: verify teacher owns the quiz's course
const verifyQuizOwnership = async (quizId, userId, role) => {
  const result = await query(
    `SELECT q.id, c.teacher_id FROM quizzes q JOIN courses c ON q.course_id = c.id WHERE q.id = $1`,
    [quizId]
  );
  if (!result.rows.length) throw createError('Quiz not found.', 404);
  if (role === 'teacher' && result.rows[0].teacher_id !== userId) {
    throw createError('You can only modify your own quizzes.', 403);
  }
  return result.rows[0];
};

// GET /api/quizzes/:quizId/questions
const getQuestions = asyncHandler(async (req, res) => {
  const showAnswers = req.user.role !== 'student';
  const result = await query(
    `SELECT id, question, question_type, options, order_index, points
     ${showAnswers ? ', correct_answer' : ''}
     FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index`,
    [req.params.quizId]
  );
  res.json({ success: true, data: result.rows });
});

// POST /api/quizzes/:quizId/questions
const addQuestion = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { question, question_type, options, correct_answer, points } = req.body;

  if (!question || !correct_answer) throw createError('question and correct_answer are required.');
  if (!['mcq', 'true_false'].includes(question_type || 'mcq')) {
    throw createError('question_type must be mcq or true_false.');
  }
  if (question_type === 'mcq' && (!options || options.length < 2)) {
    throw createError('MCQ questions require at least 2 options.');
  }

  await verifyQuizOwnership(quizId, req.user.id, req.user.role);

  // Get current max order
  const maxOrder = await query(
    'SELECT COALESCE(MAX(order_index), -1) AS max FROM quiz_questions WHERE quiz_id = $1',
    [quizId]
  );

  const result = await query(
    `INSERT INTO quiz_questions (id, quiz_id, question, question_type, options, correct_answer, points, order_index)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      uuidv4(), quizId, question,
      question_type || 'mcq',
      JSON.stringify(options || []),
      correct_answer,
      points || 1,
      maxOrder.rows[0].max + 1
    ]
  );

  res.status(201).json({ success: true, data: result.rows[0] });
});

// PUT /api/quizzes/:quizId/questions/:questionId
const updateQuestion = asyncHandler(async (req, res) => {
  const { quizId, questionId } = req.params;
  const { question, question_type, options, correct_answer, points, order_index } = req.body;

  await verifyQuizOwnership(quizId, req.user.id, req.user.role);

  const result = await query(
    `UPDATE quiz_questions SET
       question      = COALESCE($1, question),
       question_type = COALESCE($2, question_type),
       options       = COALESCE($3, options),
       correct_answer= COALESCE($4, correct_answer),
       points        = COALESCE($5, points),
       order_index   = COALESCE($6, order_index)
     WHERE id = $7 AND quiz_id = $8 RETURNING *`,
    [
      question,
      question_type,
      options ? JSON.stringify(options) : undefined,
      correct_answer,
      points,
      order_index,
      questionId,
      quizId
    ]
  );

  if (!result.rows.length) throw createError('Question not found.', 404);
  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/quizzes/:quizId/questions/:questionId
const deleteQuestion = asyncHandler(async (req, res) => {
  const { quizId, questionId } = req.params;
  await verifyQuizOwnership(quizId, req.user.id, req.user.role);

  const result = await query(
    'DELETE FROM quiz_questions WHERE id = $1 AND quiz_id = $2 RETURNING id',
    [questionId, quizId]
  );
  if (!result.rows.length) throw createError('Question not found.', 404);
  res.json({ success: true, message: 'Question deleted.' });
});

// PUT /api/quizzes/:quizId/questions/reorder
// Body: { order: [ {id, order_index}, ... ] }
const reorderQuestions = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { order } = req.body;

  if (!Array.isArray(order) || !order.length) throw createError('order array is required.');
  await verifyQuizOwnership(quizId, req.user.id, req.user.role);

  // Update each question's order_index in a single transaction
  const client = await require('../config/database').getClient();
  try {
    await client.query('BEGIN');
    for (const item of order) {
      await client.query(
        'UPDATE quiz_questions SET order_index = $1 WHERE id = $2 AND quiz_id = $3',
        [item.order_index, item.id, quizId]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Questions reordered.' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// PUT /api/quizzes/:quizId  — update quiz settings
const updateQuiz = asyncHandler(async (req, res) => {
  const { title, description, pass_score, time_limit_minutes, max_attempts } = req.body;
  await verifyQuizOwnership(req.params.quizId, req.user.id, req.user.role);

  const result = await query(
    `UPDATE quizzes SET
       title               = COALESCE($1, title),
       description         = COALESCE($2, description),
       pass_score          = COALESCE($3, pass_score),
       time_limit_minutes  = COALESCE($4, time_limit_minutes),
       max_attempts        = COALESCE($5, max_attempts),
       updated_at          = NOW()
     WHERE id = $6 RETURNING *`,
    [title, description, pass_score, time_limit_minutes, max_attempts, req.params.quizId]
  );

  res.json({ success: true, data: result.rows[0] });
});

// DELETE /api/quizzes/:quizId
const deleteQuiz = asyncHandler(async (req, res) => {
  await verifyQuizOwnership(req.params.quizId, req.user.id, req.user.role);
  await query('DELETE FROM quizzes WHERE id = $1', [req.params.quizId]);
  res.json({ success: true, message: 'Quiz deleted.' });
});

// GET /api/quizzes/:quizId/all-attempts  (teacher view)
const getAllAttempts = asyncHandler(async (req, res) => {
  await verifyQuizOwnership(req.params.quizId, req.user.id, req.user.role);

  const result = await query(
    `SELECT qa.id, qa.score, qa.total_points, qa.percentage, qa.passed,
            qa.attempt_number, qa.submitted_at,
            u.id AS student_id, u.full_name AS student_name, u.email AS student_email
     FROM quiz_attempts qa
     JOIN users u ON qa.student_id = u.id
     WHERE qa.quiz_id = $1
     ORDER BY qa.submitted_at DESC`,
    [req.params.quizId]
  );

  res.json({ success: true, data: result.rows });
});

module.exports = {
  getQuestions, addQuestion, updateQuestion, deleteQuestion,
  reorderQuestions, updateQuiz, deleteQuiz, getAllAttempts
};
