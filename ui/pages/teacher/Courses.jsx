import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, Badge, EmptyState } from '../../components/common/index.jsx'
import { courseAPI, categoryAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Eye, BookOpen, Trash2 } from 'lucide-react'

export default function TeacherCourses() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', price: '', language: 'Somali', level: 'beginner', category_id: '', duration_hours: '' })

  const load = () => { setLoading(true); courseAPI.my().then(r => setCourses(r.data.data)).finally(() => setLoading(false)) }

  useEffect(() => { load(); categoryAPI.list().then(r => setCategories(r.data.data)) }, [])

  const openCreate = () => { setEditing(null); setForm({ title: '', description: '', price: '', language: 'Somali', level: 'beginner', category_id: '', duration_hours: '' }); setShowModal(true) }

  // Auto-open the create modal when arriving via "New Course" (?new=1).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openCreate()
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const openEdit = c => { setEditing(c); setForm({ title: c.title, description: c.description || '', price: c.price || '', language: c.language || 'Somali', level: c.level || 'beginner', category_id: c.category_id || '', duration_hours: c.duration_hours || '' }); setShowModal(true) }

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '') payload.append(k, v) })
      if (editing) { await courseAPI.update(editing.id, payload); toast.success('Course updated!') }
      else { await courseAPI.create(payload); toast.success('Course created!') }
      setShowModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const submitForReview = async c => {
    try {
      await courseAPI.submitForReview(c.id)
      toast.success('Submitted for admin review')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  return (
    <DashboardLayout title="My Courses">
      <div className="page-header">
        <h1>My Courses</h1>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> New Course</button>
      </div>

      {loading ? <Spinner /> : courses.length === 0 ? (
        <EmptyState icon={<BookOpen size={48}/>} title="No courses yet" description="Create your first course to get started."
          action={<button className="btn btn-primary" onClick={openCreate}>Create Course</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {courses.map(c => (
            <div key={c.id} className="card">
              <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ width: 80, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--border-soft)' }}>
                  {c.thumbnail ? <img src={c.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)' }}><BookOpen size={20} color="rgba(255,255,255,0.5)" /></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{c.title}</span>
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
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                    <span>{c.category || 'No category'}</span>
                    <span>{c.level}</span>
                    <span>{c.total_students} students</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>${c.price}</span>
                  </div>
                  {c.course_status === 'rejected' && c.review_comment && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>
                      Admin feedback: {c.review_comment}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link to={`/teacher/courses/${c.id}`} className="btn btn-outline btn-sm"><Eye size={14}/> Manage</Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Edit size={14}/></button>
                  {(c.course_status === 'draft' || c.course_status === 'rejected') && (
                    <button className="btn btn-sm" style={{ background: '#dbeafe', color: 'var(--primary)' }} onClick={() => submitForReview(c)}>
                      Submit for Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Course' : 'Create New Course'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? <Spinner size={16}/> : editing ? 'Save Changes' : 'Create Course'}</button>
        </>}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Course Title *</label>
            <input className="form-control" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Introduction to Web Development" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Price ($)</label>
              <input className="form-control" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (hours)</label>
              <input className="form-control" type="number" min="0" value={form.duration_hours} onChange={e => setForm({ ...form, duration_hours: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Level</label>
              <select className="form-control" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select className="form-control" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                <option>Somali</option><option>Arabic</option><option>English</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-control" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
