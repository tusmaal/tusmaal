import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, ConfirmModal, Badge, EmptyState } from '../../components/common/index.jsx'
import { liveAPI, cohortAPI, courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Video, Users, Calendar, Clock, ExternalLink } from 'lucide-react'

const blankSession = { title: '', description: '', provider: 'meet', meeting_url: '', scheduled_at: '', duration_minutes: 60 }
const blankCohort = { name: '', start_date: '', end_date: '', drip_enabled: false, capacity: '' }

export default function LiveClasses() {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [tab, setTab] = useState('live')

  const [sessions, setSessions] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(false)

  const [showSession, setShowSession] = useState(false)
  const [showCohort, setShowCohort] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)   // { kind, id, label }
  const [saving, setSaving] = useState(false)
  const [sForm, setSForm] = useState(blankSession)
  const [cForm, setCForm] = useState(blankCohort)

  useEffect(() => {
    courseAPI.my().then(r => { const cs = r.data.data || []; setCourses(cs); if (cs[0]) setCourseId(cs[0].id) }).catch(() => {})
  }, [])

  const loadAll = () => {
    if (!courseId) return
    setLoading(true)
    Promise.all([
      liveAPI.list(courseId).then(r => setSessions(r.data.data || [])),
      cohortAPI.list(courseId).then(r => setCohorts(r.data.data || [])),
      courseAPI.getSections(courseId).then(r => setSections(r.data.data || [])).catch(() => setSections([])),
    ]).finally(() => setLoading(false))
  }
  useEffect(() => { loadAll() }, [courseId])

  // ── Live sessions ──
  const openSession = (s = null) => {
    setEditing(s)
    setSForm(s ? {
      title: s.title, description: s.description || '', provider: s.provider,
      meeting_url: s.meeting_url, scheduled_at: s.scheduled_at ? s.scheduled_at.slice(0, 16) : '',
      duration_minutes: s.duration_minutes || 60,
    } : blankSession)
    setShowSession(true)
  }
  const saveSession = async e => {
    e.preventDefault(); setSaving(true)
    const payload = { ...sForm, duration_minutes: Number(sForm.duration_minutes) }
    try {
      if (editing) { await liveAPI.update(editing.id, payload); toast.success('Session updated') }
      else { await liveAPI.create(courseId, payload); toast.success('Session scheduled — students notified') }
      setShowSession(false); loadAll()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  // ── Cohorts ──
  const openCohort = (c = null) => {
    setEditing(c)
    setCForm(c ? {
      name: c.name, start_date: c.start_date?.slice(0, 10) || '', end_date: c.end_date?.slice(0, 10) || '',
      drip_enabled: c.drip_enabled, capacity: c.capacity || '',
    } : blankCohort)
    setShowCohort(true)
  }
  const saveCohort = async e => {
    e.preventDefault(); setSaving(true)
    const payload = { ...cForm, capacity: cForm.capacity === '' ? null : Number(cForm.capacity) }
    try {
      if (editing) { await cohortAPI.update(editing.id, payload); toast.success('Cohort updated') }
      else { await cohortAPI.create(courseId, payload); toast.success('Cohort created') }
      setShowCohort(false); loadAll()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  // ── Drip ──
  const saveDrip = async (sectionId, val) => {
    try { await cohortAPI.setDrip(sectionId, { drip_offset_days: Number(val) || 0 }); toast.success('Drip schedule saved') }
    catch { toast.error('Failed to save drip') }
  }

  const del = async () => {
    setSaving(true)
    try {
      if (deleting.kind === 'session') await liveAPI.delete(deleting.id)
      else await cohortAPI.delete(deleting.id)
      toast.success('Deleted'); setDeleting(null); loadAll()
    } catch { toast.error('Failed') } finally { setSaving(false) }
  }

  return (
    <DashboardLayout title="Live & Cohorts">
      <div className="page-header">
        <h1>Live Classes & Cohorts</h1>
        <select className="form-control" style={{ maxWidth: 280 }} value={courseId} onChange={e => setCourseId(e.target.value)}>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          {!courses.length && <option>No courses yet</option>}
        </select>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab-btn${tab === 'live' ? ' active' : ''}`} onClick={() => setTab('live')}><Video size={14}/> Live Sessions</button>
        <button className={`tab-btn${tab === 'cohorts' ? ' active' : ''}`} onClick={() => setTab('cohorts')}><Users size={14}/> Cohorts</button>
        <button className={`tab-btn${tab === 'drip' ? ' active' : ''}`} onClick={() => setTab('drip')}><Clock size={14}/> Drip Schedule</button>
      </div>

      {loading ? <Spinner /> : (
        <>
          {tab === 'live' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button className="btn btn-primary" onClick={() => openSession()} disabled={!courseId}><Plus size={16}/> Schedule Class</button>
              </div>
              {!sessions.length ? (
                <EmptyState icon={<Video size={48}/>} title="No live classes scheduled" description="Add a Zoom, Meet, or Jitsi link and students get notified." />
              ) : (
                <div className="grid-2">
                  {sessions.map(s => {
                    const when = new Date(s.scheduled_at)
                    const past = when < new Date()
                    return (
                      <div key={s.id} className="card"><div className="card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <h3 style={{ fontSize: 16 }}>{s.title}</h3>
                          <Badge variant={past ? 'muted' : 'success'}>{past ? 'past' : s.provider}</Badge>
                        </div>
                        {s.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0' }}>{s.description}</p>}
                        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
                          <Calendar size={14}/> {when.toLocaleString()} · {s.duration_minutes} min
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <a className="btn btn-secondary btn-sm" href={s.meeting_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/> Open link</a>
                          <button className="btn btn-ghost btn-sm" onClick={() => openSession(s)}><Edit size={13}/></button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleting({ kind: 'session', id: s.id, label: s.title })}><Trash2 size={13}/></button>
                        </div>
                      </div></div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'cohorts' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button className="btn btn-primary" onClick={() => openCohort()} disabled={!courseId}><Plus size={16}/> New Cohort</button>
              </div>
              {!cohorts.length ? (
                <EmptyState icon={<Users size={48}/>} title="No cohorts yet" description="Run your course in batches with fixed start dates and drip-released content." />
              ) : (
                <div className="grid-2">
                  {cohorts.map(c => (
                    <div key={c.id} className="card"><div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: 16 }}>{c.name}</h3>
                        {c.drip_enabled && <Badge variant="primary">drip on</Badge>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0' }}>
                        Starts {new Date(c.start_date).toLocaleDateString()}{c.end_date ? ` · ends ${new Date(c.end_date).toLocaleDateString()}` : ''}
                      </div>
                      <div style={{ fontSize: 13 }}>{c.enrolled_count} enrolled{c.capacity ? ` / ${c.capacity}` : ''}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openCohort(c)}><Edit size={13}/> Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleting({ kind: 'cohort', id: c.id, label: c.name })}><Trash2 size={13}/></button>
                      </div>
                    </div></div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'drip' && (
            <div className="card"><div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Set how many days after the start date (cohort start, or the student's enrollment for self-paced) each section unlocks. 0 = available immediately.
              </p>
              {!sections.length ? <EmptyState title="No sections" description="Add sections to this course first." /> : (
                sections.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
                    <span style={{ fontSize: 14 }}>{s.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" min="0" className="form-control" style={{ width: 90 }}
                        defaultValue={s.drip_offset_days || 0}
                        onBlur={e => saveDrip(s.id, e.target.value)} />
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>days</span>
                    </div>
                  </div>
                ))
              )}
            </div></div>
          )}
        </>
      )}

      {/* Session modal */}
      <Modal open={showSession} onClose={() => setShowSession(false)} title={editing ? 'Edit Live Class' : 'Schedule Live Class'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowSession(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveSession} disabled={saving}>{saving ? <Spinner size={16}/> : 'Save'}</button>
        </>}>
        <form onSubmit={saveSession}>
          <div className="form-group"><label className="form-label">Title *</label>
            <input className="form-control" required value={sForm.title} onChange={e => setSForm({ ...sForm, title: e.target.value })} placeholder="Week 1 Live Q&A" /></div>
          <div className="form-group"><label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={sForm.description} onChange={e => setSForm({ ...sForm, description: e.target.value })} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Provider</label>
              <select className="form-control" value={sForm.provider} onChange={e => setSForm({ ...sForm, provider: e.target.value })}>
                <option value="meet">Google Meet</option><option value="zoom">Zoom</option><option value="jitsi">Jitsi</option><option value="other">Other</option>
              </select></div>
            <div className="form-group"><label className="form-label">Duration (min)</label>
              <input className="form-control" type="number" min="15" value={sForm.duration_minutes} onChange={e => setSForm({ ...sForm, duration_minutes: e.target.value })} /></div>
          </div>
          <div className="form-group"><label className="form-label">Meeting Link *</label>
            <input className="form-control" required type="url" value={sForm.meeting_url} onChange={e => setSForm({ ...sForm, meeting_url: e.target.value })} placeholder="https://meet.google.com/..." /></div>
          <div className="form-group"><label className="form-label">Date & Time *</label>
            <input className="form-control" required type="datetime-local" value={sForm.scheduled_at} onChange={e => setSForm({ ...sForm, scheduled_at: e.target.value })} /></div>
        </form>
      </Modal>

      {/* Cohort modal */}
      <Modal open={showCohort} onClose={() => setShowCohort(false)} title={editing ? 'Edit Cohort' : 'New Cohort'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowCohort(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveCohort} disabled={saving}>{saving ? <Spinner size={16}/> : 'Save'}</button>
        </>}>
        <form onSubmit={saveCohort}>
          <div className="form-group"><label className="form-label">Cohort Name *</label>
            <input className="form-control" required value={cForm.name} onChange={e => setCForm({ ...cForm, name: e.target.value })} placeholder="January 2026 Batch" /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Start Date *</label>
              <input className="form-control" required type="date" value={cForm.start_date} onChange={e => setCForm({ ...cForm, start_date: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">End Date</label>
              <input className="form-control" type="date" value={cForm.end_date} onChange={e => setCForm({ ...cForm, end_date: e.target.value })} /></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Capacity</label>
              <input className="form-control" type="number" min="1" placeholder="Unlimited" value={cForm.capacity} onChange={e => setCForm({ ...cForm, capacity: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Drip Content</label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={cForm.drip_enabled} onChange={e => setCForm({ ...cForm, drip_enabled: e.target.checked })} />
                Release sections gradually
              </label></div>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving}
        title="Delete" message={`Delete "${deleting?.label}"?`} />
    </DashboardLayout>
  )
}
