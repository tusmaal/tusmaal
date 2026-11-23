import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, Badge, EmptyState } from '../../components/common/index.jsx'
import { adminAPI, courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Search, ShieldCheck, ShieldOff, Plus } from 'lucide-react'

export default function CourseAccess() {
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState(null)
  const [access, setAccess] = useState([])
  const [courses, setCourses] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showGrant, setShowGrant] = useState(false)
  const [grantForm, setGrantForm] = useState({ course_id: '', notes: '' })

  useEffect(() => {
    setStudentsLoading(true)
    adminAPI.getUsers({ role: 'student', limit: 500 })
      .then(r => setStudents(r.data.data || []))
      .finally(() => setStudentsLoading(false))
  }, [])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(s =>
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    )
  }, [students, search])

  useEffect(() => {
    courseAPI.my().then(r => setCourses(r.data.data)).catch(() =>
      courseAPI.list({ limit: 100 }).then(r => setCourses(r.data.data)))
  }, [])

  const selectStudent = async student => {
    setSelected(student)
    setLoading(true)
    adminAPI.getStudentAccess(student.id)
      .then(r => setAccess(r.data.data))
      .finally(() => setLoading(false))
  }

  const grantAccess = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await adminAPI.grantAccess(selected.id, grantForm)
      toast.success('Course access granted!')
      setShowGrant(false)
      setGrantForm({ course_id: '', notes: '' })
      const r = await adminAPI.getStudentAccess(selected.id)
      setAccess(r.data.data)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const revokeAccess = async courseId => {
    setSaving(true)
    try {
      await adminAPI.revokeAccess(selected.id, courseId)
      toast.success('Access revoked')
      const r = await adminAPI.getStudentAccess(selected.id)
      setAccess(r.data.data)
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <DashboardLayout title="Course Access Control">
      <div className="page-header">
        <div>
          <h1>Course Access</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Grant or revoke course access after verifying manual payment. Each grant includes 6 months of access.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        {/* Student list */}
        <div className="card">
          <div style={{ padding: '16px 16px 12px' }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Select Student</div>
            <div className="search-bar">
              <Search size={14} />
              <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {studentsLoading ? (
              <div style={{ padding: 18, display: 'flex', justifyContent: 'center' }}>
                <Spinner size={18} />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
                {search.trim() ? 'No students match your search.' : 'No students found.'}
              </div>
            ) : filteredStudents.map(s => (
              <button key={s.id} onClick={() => selectStudent(s)}
                style={{ width: '100%', padding: '11px 16px', border: 'none', borderTop: '1px solid var(--border-soft)', background: selected?.id === s.id ? '#dbeafe' : 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{s.full_name?.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: selected?.id === s.id ? 'var(--primary)' : 'var(--text)' }}>{s.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Access panel */}
        <div>
          {!selected ? (
            <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <ShieldCheck size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text)' }}>Select a student</h3>
              <p style={{ fontSize: 14 }}>Choose a student on the left to manage their course access.</p>
            </div>
          ) : (
            <div>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{selected.full_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.email} · {selected.phone || 'No phone'}</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowGrant(true)}><Plus size={16} /> Grant Access</button>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <h3 style={{ fontSize: 15, marginBottom: 16 }}>Course Access ({access.length})</h3>
                  {loading ? <Spinner /> : access.length === 0 ? (
                    <EmptyState icon={<ShieldOff size={36} />} title="No courses yet"
                      description="Grant this student access to a course after receiving payment." />
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr><th>Course</th><th>Status</th><th>Granted</th><th>Expires</th><th>Notes</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                          {access.map(a => {
                            const expired = a.is_active && a.expires_at && new Date(a.expires_at) <= new Date()
                            const status = !a.is_active ? 'Revoked' : expired ? 'Expired' : 'Active'
                            const variant = !a.is_active ? 'danger' : expired ? 'warning' : 'success'
                            return (
                            <tr key={a.id}>
                              <td style={{ fontWeight: 500 }}>{a.title}</td>
                              <td><Badge variant={variant}>{status}</Badge></td>
                              <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(a.granted_at).toLocaleDateString()}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{a.expires_at ? new Date(a.expires_at).toLocaleDateString() : '—'}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{a.notes || '—'}</td>
                              <td>
                                {a.is_active && !expired && (
                                  <button className="btn btn-danger btn-sm" onClick={() => revokeAccess(a.course_id)} disabled={saving}>
                                    <ShieldOff size={13} /> Revoke
                                  </button>
                                )}
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showGrant} onClose={() => setShowGrant(false)} title={`Grant Course Access — ${selected?.full_name}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowGrant(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={grantAccess} disabled={saving}>{saving ? <Spinner size={16} /> : <><ShieldCheck size={14} /> Grant Access</>}</button>
        </>}>
        <div className="alert alert-info" style={{ marginBottom: 16 }}>Only grant access after confirming payment. Access lasts 6 months from the grant date.</div>
        <form onSubmit={grantAccess}>
          <div className="form-group">
            <label className="form-label">Select Course *</label>
            <select className="form-control" required value={grantForm.course_id} onChange={e => setGrantForm({ ...grantForm, course_id: e.target.value })}>
              <option value="">Choose a course...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-control" rows={3} placeholder="e.g. Paid $50 via EVC Plus on 2024-01-15"
              value={grantForm.notes} onChange={e => setGrantForm({ ...grantForm, notes: e.target.value })} />
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
