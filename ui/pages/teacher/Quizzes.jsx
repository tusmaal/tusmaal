import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, Badge, EmptyState } from '../../components/common/index.jsx'
import { quizAPI, courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, FileText, CheckSquare } from 'lucide-react'

export default function TeacherQuizzes() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [attempts, setAttempts] = useState([])
  const [activeTab, setActiveTab] = useState('questions')
  const [showCreate, setShowCreate] = useState(false)
  const [showAddQ, setShowAddQ] = useState(false)
  const [saving, setSaving] = useState(false)
  const [quizForm, setQuizForm] = useState({ title: '', pass_score: 70, max_attempts: 3, time_limit_minutes: '' })
  const [qForm, setQForm] = useState({ question: '', question_type: 'mcq', options: ['', '', '', ''], correct_answer: '', points: 1 })

  useEffect(() => {
    courseAPI.my().then(r => { setCourses(r.data.data || []); if (r.data.data?.[0]) setSelectedCourse(r.data.data[0].id) })
  }, [])

  useEffect(() => {
    if (selectedCourse) loadQuizzes()
  }, [selectedCourse])

  const loadQuizzes = async () => {
    setSelectedQuiz(null)
    try {
      const r = await quizAPI.list(selectedCourse)
      setQuizzes(r.data.data || [])
    } catch {
      setQuizzes([])
      toast.error('Failed to load quizzes')
    }
  }

  const createQuiz = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const r = await quizAPI.create({ ...quizForm, course_id: selectedCourse })
      toast.success('Quiz created!')
      setShowCreate(false)
      setSelectedQuiz(r.data.data)
      loadQuestions(r.data.data.id)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const loadQuestions = async qid => {
    const r = await quizAPI.getQuestions(qid)
    setQuestions(r.data.data || [])
  }

  const loadAttempts = async qid => {
    const r = await quizAPI.allAttempts(qid)
    setAttempts(r.data.data || [])
  }

  const addQuestion = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...qForm, options: qForm.question_type === 'true_false' ? ['True', 'False'] : qForm.options.filter(o => o.trim()) }
      await quizAPI.addQuestion(selectedQuiz.id, payload)
      toast.success('Question added!')
      setShowAddQ(false)
      setQForm({ question: '', question_type: 'mcq', options: ['', '', '', ''], correct_answer: '', points: 1 })
      loadQuestions(selectedQuiz.id)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const deleteQuestion = async qid => {
    if (!confirm('Delete this question?')) return
    await quizAPI.deleteQuestion(selectedQuiz.id, qid)
    toast.success('Deleted')
    loadQuestions(selectedQuiz.id)
  }

  const handleTabChange = tab => {
    setActiveTab(tab)
    if (tab === 'attempts' && selectedQuiz) loadAttempts(selectedQuiz.id)
  }

  return (
    <DashboardLayout title="Quizzes">
      <div className="page-header">
        <h1>Quizzes</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={!selectedCourse}>
          <Plus size={16}/> Create Quiz
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <select className="form-control" style={{ maxWidth: 320 }} value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setSelectedQuiz(null) }}>
          <option value="">Select course...</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {!selectedQuiz ? (
        quizzes.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ opacity: 0.2, marginBottom: 14 }}/>
            <p>Create a quiz or select one to manage its questions.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)} disabled={!selectedCourse}>
              <Plus size={16}/> Create First Quiz
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {quizzes.map(q => (
              <button
                key={q.id}
                className="card"
                style={{ textAlign: 'left', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                onClick={() => {
                  setSelectedQuiz(q)
                  loadQuestions(q.id)
                }}
              >
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Questions: {q.questions_count} • Pass: {q.pass_score}% • Attempts: {q.max_attempts}
                    </div>
                  </div>
                  <Badge variant="muted">Open</Badge>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedQuiz(null)}>← All Quizzes</button>
            <h3 style={{ fontSize: 18 }}>{selectedQuiz.title}</h3>
            <Badge variant="primary">Pass: {selectedQuiz.pass_score}%</Badge>
            <Badge variant="muted">Max attempts: {selectedQuiz.max_attempts}</Badge>
          </div>

          <div className="tabs">
            {[['questions','Questions (' + questions.length + ')'],['attempts','Student Attempts']].map(([v,l]) => (
              <button key={v} className={`tab-btn${activeTab===v?' active':''}`} onClick={() => handleTabChange(v)}>{l}</button>
            ))}
          </div>

          {activeTab === 'questions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddQ(true)}><Plus size={14}/> Add Question</button>
              </div>
              {questions.length === 0
                ? <EmptyState icon={<CheckSquare size={40}/>} title="No questions yet" description="Add your first question." action={<button className="btn btn-primary btn-sm" onClick={() => setShowAddQ(true)}>Add Question</button>}/>
                : questions.map((q, i) => (
                  <div key={q.id} className="card" style={{ marginBottom: 12 }}>
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 13 }}>Q{i + 1}.</span>
                            <Badge variant={q.question_type === 'mcq' ? 'primary' : 'muted'}>{q.question_type === 'mcq' ? 'MCQ' : 'True/False'}</Badge>
                            <Badge variant="accent">{q.points} pt{q.points !== 1 ? 's' : ''}</Badge>
                          </div>
                          <div style={{ fontWeight: 500, marginBottom: 10 }}>{q.question}</div>
                          {q.options && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {(typeof q.options === 'string' ? JSON.parse(q.options) : q.options).map((opt, oi) => (
                                <div key={oi} style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: opt === q.correct_answer ? '#dcfce7' : 'var(--bg)', color: opt === q.correct_answer ? 'var(--success)' : 'var(--text)', fontWeight: opt === q.correct_answer ? 600 : 400 }}>
                                  {opt === q.correct_answer ? '✓ ' : '○ '}{opt}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', marginLeft: 12 }} onClick={() => deleteQuestion(q.id)}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {activeTab === 'attempts' && (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Score</th><th>Passed</th><th>Attempt</th><th>Date</th></tr></thead>
                  <tbody>
                    {attempts.length === 0
                      ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No attempts yet.</td></tr>
                      : attempts.map(a => (
                        <tr key={a.id}>
                          <td><div style={{ fontWeight: 500 }}>{a.student_name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.student_email}</div></td>
                          <td><strong>{a.percentage}%</strong> ({a.score}/{a.total_points})</td>
                          <td><Badge variant={a.passed ? 'success' : 'danger'}>{a.passed ? 'Passed' : 'Failed'}</Badge></td>
                          <td>#{a.attempt_number}</td>
                          <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(a.submitted_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create quiz modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Quiz"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createQuiz} disabled={saving}>{saving ? <Spinner size={16}/> : 'Create Quiz'}</button>
        </>}>
        <form onSubmit={createQuiz}>
          <div className="form-group"><label className="form-label">Quiz Title *</label><input className="form-control" required value={quizForm.title} onChange={e => setQuizForm({ ...quizForm, title: e.target.value })}/></div>
          <div className="form-grid-3">
            <div className="form-group"><label className="form-label">Pass Score (%)</label><input className="form-control" type="number" min="1" max="100" value={quizForm.pass_score} onChange={e => setQuizForm({ ...quizForm, pass_score: e.target.value })}/></div>
            <div className="form-group"><label className="form-label">Max Attempts</label><input className="form-control" type="number" min="1" value={quizForm.max_attempts} onChange={e => setQuizForm({ ...quizForm, max_attempts: e.target.value })}/></div>
            <div className="form-group"><label className="form-label">Time Limit (min)</label><input className="form-control" type="number" min="1" placeholder="None" value={quizForm.time_limit_minutes} onChange={e => setQuizForm({ ...quizForm, time_limit_minutes: e.target.value })}/></div>
          </div>
        </form>
      </Modal>

      {/* Add question modal */}
      <Modal open={showAddQ} onClose={() => setShowAddQ(false)} title="Add Question"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowAddQ(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={addQuestion} disabled={saving}>{saving ? <Spinner size={16}/> : 'Add Question'}</button>
        </>}>
        <form onSubmit={addQuestion}>
          <div className="form-group"><label className="form-label">Question *</label><textarea className="form-control" rows={2} required value={qForm.question} onChange={e => setQForm({ ...qForm, question: e.target.value })}/></div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-control" value={qForm.question_type} onChange={e => setQForm({ ...qForm, question_type: e.target.value, correct_answer: '' })}>
                <option value="mcq">Multiple Choice</option>
                <option value="true_false">True / False</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Points</label><input className="form-control" type="number" min="1" value={qForm.points} onChange={e => setQForm({ ...qForm, points: parseInt(e.target.value) })}/></div>
          </div>
          {qForm.question_type === 'mcq' && (
            <div className="form-group">
              <label className="form-label">Options (min 2)</label>
              {qForm.options.map((opt, i) => (
                <input key={i} className="form-control" style={{ marginBottom: 8 }} placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const o = [...qForm.options]; o[i] = e.target.value; setQForm({ ...qForm, options: o }) }}/>
              ))}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Correct Answer *</label>
            {qForm.question_type === 'true_false'
              ? <select className="form-control" value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} required>
                  <option value="">Select...</option><option>True</option><option>False</option>
                </select>
              : <select className="form-control" value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} required>
                  <option value="">Select correct option...</option>
                  {qForm.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
                </select>}
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
