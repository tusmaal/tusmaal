import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, EmptyState, ConfirmModal } from '../../components/common/index.jsx'
import { announcementAPI, courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Megaphone, Trash2 } from 'lucide-react'

export default function TeacherAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', course_id: '' })

  const load = () => announcementAPI.list().then(r => setAnnouncements(r.data.data || []))

  useEffect(() => {
    load()
    courseAPI.my().then(r => setCourses(r.data.data || []))
  }, [])

  const create = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await announcementAPI.create(form)
      toast.success('Announcement posted!')
      setShowModal(false); setForm({ title: '', body: '', course_id: '' }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const del = async () => {
    setSaving(true)
    try { await announcementAPI.delete(deleting.id); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <DashboardLayout title="Announcements">
      <div className="page-header">
        <h1>Announcements</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16}/> Post Announcement</button>
      </div>

      {announcements.length === 0
        ? <EmptyState icon={<Megaphone size={48}/>} title="No announcements yet" description="Post an announcement to notify your students." action={<button className="btn btn-primary" onClick={() => setShowModal(true)}>Post Announcement</button>}/>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {announcements.map(a => (
              <div key={a.id} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        {a.course_title && <span className="badge badge-primary">{a.course_title}</span>}
                        {a.is_global && <span className="badge badge-accent">Global</span>}
                      </div>
                      <h3 style={{ fontSize: 16, marginBottom: 8 }}>{a.title}</h3>
                      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{a.body}</p>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>{new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', marginLeft: 12 }} onClick={() => setDeleting(a)}><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Post Announcement"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={saving}>{saving ? <Spinner size={16}/> : 'Post'}</button>
        </>}>
        <form onSubmit={create}>
          <div className="form-group"><label className="form-label">Course (leave blank for all your students)</label>
            <select className="form-control" value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}>
              <option value="">All my students</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Title *</label><input className="form-control" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></div>
          <div className="form-group"><label className="form-label">Message *</label><textarea className="form-control" rows={4} required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}/></div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving} title="Delete Announcement" message={`Delete "${deleting?.title}"? Students will no longer see it.`}/>
    </DashboardLayout>
  )
}
