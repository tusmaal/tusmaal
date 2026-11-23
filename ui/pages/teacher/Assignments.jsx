import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, Badge, EmptyState } from '../../components/common/index.jsx'
import { assignmentAPI, courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, ClipboardList, Eye, Star } from 'lucide-react'

export default function TeacherAssignments() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [viewingSubs, setViewingSubs] = useState(null)
  const [gradeModal, setGradeModal] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_grade: 100 })
  const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' })

  useEffect(() => {
    courseAPI.my().then(r => { setCourses(r.data.data || []); if (r.data.data?.[0]) setSelectedCourse(r.data.data[0].id) })
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      assignmentAPI.list(selectedCourse).then(r => setAssignments(r.data.data || []))
    }
  }, [selectedCourse])

  const createAssignment = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await assignmentAPI.create({ ...form, course_id: selectedCourse })
      toast.success('Assignment created!')
      setCreateModal(false)
      setForm({ title: '', description: '', due_date: '', max_grade: 100 })
      assignmentAPI.list(selectedCourse).then(r => setAssignments(r.data.data || []))
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const viewSubmissions = async (assignment) => {
    setViewingSubs(assignment)
    const r = await assignmentAPI.submissions(assignment.id)
    setSubmissions(r.data.data || [])
  }

  const submitGrade = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await assignmentAPI.grade(gradeModal.assignment_id, gradeModal.id, { grade: parseInt(gradeForm.grade), feedback: gradeForm.feedback })
      toast.success('Graded!')
      setGradeModal(null)
      setGradeForm({ grade: '', feedback: '' })
      viewSubmissions(viewingSubs)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <DashboardLayout title="Assignments">
      <div className="page-header">
        <h1>Assignments</h1>
        <button className="btn btn-primary" onClick={() => setCreateModal(true)} disabled={!selectedCourse}>
          <Plus size={16}/> Create Assignment
        </button>
      </div>

      {/* Course selector */}
      <div style={{ marginBottom: 24 }}>
        <select className="form-control" style={{ maxWidth: 320 }} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
          <option value="">Select course...</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {!selectedCourse ? (
        <EmptyState icon={<ClipboardList size={48}/>} title="Select a course" description="Choose a course to view and manage its assignments." />
      ) : assignments.length === 0 ? (
        <EmptyState icon={<ClipboardList size={48}/>} title="No assignments yet"
          description="Create your first assignment for this course."
          action={<button className="btn btn-primary" onClick={() => setCreateModal(true)}>Create Assignment</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {assignments.map(a => (
            <div key={a.id} className="card">
              <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                    {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                    <span>Max grade: {a.max_grade}</span>
                    <span>{a.submission_count} submissions</span>
                    {a.graded_count < a.submission_count && (
                      <Badge variant="warning">{a.submission_count - a.graded_count} pending</Badge>
                    )}
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => viewSubmissions(a)}>
                  <Eye size={14}/> View Submissions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submissions drawer */}
      {viewingSubs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,34,56,0.5)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && setViewingSubs(null)}>
          <div style={{ width: 560, background: 'var(--bg-card)', height: '100%', overflow: 'auto', boxShadow: 'var(--shadow-lg)', padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3>{viewingSubs.title} — Submissions</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewingSubs(null)}>✕</button>
            </div>
            {submissions.length === 0
              ? <p style={{ color: 'var(--text-muted)' }}>No submissions yet.</p>
              : submissions.map(sub => (
                <div key={sub.id} className="card" style={{ marginBottom: 14 }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{sub.student_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub.student_email}</div>
                      </div>
                      {sub.grade != null
                        ? <Badge variant="success">Graded: {sub.grade}/{viewingSubs.max_grade}</Badge>
                        : <Badge variant="warning">Pending</Badge>}
                    </div>
                    {sub.submission_text && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>{sub.submission_text.slice(0, 200)}{sub.submission_text.length > 200 ? '...' : ''}</p>}
                    {sub.file_url && <a href={sub.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }}>📎 View File</a>}
                    {sub.feedback && <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}><strong>Feedback:</strong> {sub.feedback}</div>}
                    <button className="btn btn-primary btn-sm" onClick={() => { setGradeModal({ ...sub, assignment_id: viewingSubs.id }); setGradeForm({ grade: sub.grade || '', feedback: sub.feedback || '' }) }}>
                      <Star size={13}/> {sub.grade != null ? 'Re-grade' : 'Grade'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Assignment"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setCreateModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createAssignment} disabled={saving}>{saving ? <Spinner size={16}/> : 'Create'}</button>
        </>}>
        <form onSubmit={createAssignment}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-control" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-control" type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Grade</label>
              <input className="form-control" type="number" min="1" value={form.max_grade} onChange={e => setForm({ ...form, max_grade: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Grade modal */}
      <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title={`Grade — ${gradeModal?.student_name}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setGradeModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={submitGrade} disabled={saving}>{saving ? <Spinner size={16}/> : 'Submit Grade'}</button>
        </>}>
        <form onSubmit={submitGrade}>
          <div className="form-group">
            <label className="form-label">Grade (out of {viewingSubs?.max_grade}) *</label>
            <input className="form-control" type="number" min="0" max={viewingSubs?.max_grade} required value={gradeForm.grade} onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Feedback</label>
            <textarea className="form-control" rows={4} placeholder="Write feedback for the student..." value={gradeForm.feedback} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })} />
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
