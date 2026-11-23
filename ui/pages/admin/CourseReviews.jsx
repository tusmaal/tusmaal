import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, Badge } from '../../components/common/index.jsx'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Search, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CourseReviews() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('pending_review')
  const [selected, setSelected] = useState(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    adminAPI.getReviewCourses({ status, search })
      .then(r => setCourses(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [status, search])

  const review = async action => {
    if (!selected) return
    if (action === 'reject' && !comment.trim()) {
      toast.error('Please write feedback for the teacher')
      return
    }
    setSaving(true)
    try {
      await adminAPI.reviewCourse(selected.id, { action, comment })
      toast.success(
        action === 'publish'
          ? 'Course published'
          : action === 'pending_review'
            ? 'Course moved to pending review'
            : 'Course rejected'
      )
      setSelected(null)
      setComment('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Draft Courses">
      <div className="page-header">
        <div>
          <h1>Draft Courses Review</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Review teacher submissions, publish approved courses, or send feedback.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 360 }}>
          <Search size={16} />
          <input placeholder="Search by course or teacher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ maxWidth: 220 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="pending_review">Pending Review</option>
          <option value="draft">Draft</option>
          <option value="rejected">Rejected</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Course</th><th>Teacher</th><th>Status</th><th>Submitted</th><th>Feedback</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><Spinner /></td></tr>
              ) : courses.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No courses found in this status.</td></tr>
              ) : courses.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.category || 'No category'} • {c.level}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{c.teacher_name || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.teacher_email || ''}</div>
                  </td>
                  <td>
                    <Badge variant={
                      c.course_status === 'published' ? 'success' :
                      c.course_status === 'pending_review' ? 'primary' :
                      c.course_status === 'rejected' ? 'danger' : 'muted'
                    }>
                      {c.course_status === 'pending_review' ? 'Pending Review'
                        : c.course_status === 'rejected' ? 'Rejected'
                        : c.course_status === 'published' ? 'Published'
                        : 'Draft'}
                    </Badge>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {c.submitted_for_review_at ? new Date(c.submitted_for_review_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280 }}>
                    {c.review_comment || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link to={`/teacher/courses/${c.id}`} className="btn btn-ghost btn-sm"><Eye size={14} /></Link>
                      {c.course_status === 'draft' && (
                        <button className="btn btn-glass btn-sm" onClick={() => { setSelected(c); setComment('') }}>
                          Send Pending
                        </button>
                      )}
                      {(c.course_status === 'pending_review' || c.course_status === 'rejected') && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(c); setComment('') }}>
                            <CheckCircle2 size={13} /> Review
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Review Course — ${selected?.title}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
          {selected?.course_status === 'draft' && (
            <button className="btn btn-glass" onClick={() => review('pending_review')} disabled={saving}>
              {saving ? <Spinner size={14} /> : 'Move to Pending'}
            </button>
          )}
          <button className="btn btn-danger" onClick={() => review('reject')} disabled={saving}>
            {saving ? <Spinner size={14} /> : <><XCircle size={14} /> Reject</>}
          </button>
          <button className="btn btn-secondary" onClick={() => review('publish')} disabled={saving}>
            {saving ? <Spinner size={14} /> : <><CheckCircle2 size={14} /> Publish</>}
          </button>
        </>}>
        <div className="form-group">
          <label className="form-label">Comment to teacher (required when rejecting)</label>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Example: Add at least 3 lessons, improve course description, and include assignment instructions."
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>
      </Modal>
    </DashboardLayout>
  )
}
