import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, ConfirmModal, Badge, EmptyState } from '../../components/common/index.jsx'
import { bundleAPI, courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Package, Repeat } from 'lucide-react'

const blankBundle = { title: '', description: '', price: 0, course_ids: [] }
const blankPlan = { name: '', description: '', price: 0, interval: 'monthly', duration_days: 30 }

export default function Bundles() {
  const [tab, setTab] = useState('bundles')
  const [bundles, setBundles] = useState([])
  const [plans, setPlans] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBundle, setShowBundle] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [bForm, setBForm] = useState(blankBundle)
  const [pForm, setPForm] = useState(blankPlan)

  const load = () => Promise.all([
    bundleAPI.list().then(r => setBundles(r.data.data || [])),
    bundleAPI.plans().then(r => setPlans(r.data.data || [])),
  ]).finally(() => setLoading(false))

  useEffect(() => {
    load()
    courseAPI.list().then(r => setCourses(r.data.data || [])).catch(() => {})
  }, [])

  const openBundle = (b = null) => {
    setEditing(b)
    setBForm(b ? { title: b.title, description: b.description || '', price: b.price, course_ids: (b.courses || []).map(c => c.id) } : blankBundle)
    setShowBundle(true)
  }
  const toggleCourse = id => setBForm(f => ({ ...f, course_ids: f.course_ids.includes(id) ? f.course_ids.filter(x => x !== id) : [...f.course_ids, id] }))

  const saveBundle = async e => {
    e.preventDefault(); setSaving(true)
    const payload = { ...bForm, price: Number(bForm.price) }
    try {
      if (editing) { await bundleAPI.update(editing.id, payload); toast.success('Bundle updated') }
      else { await bundleAPI.create(payload); toast.success('Bundle created') }
      setShowBundle(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  const savePlan = async e => {
    e.preventDefault(); setSaving(true)
    try { await bundleAPI.createPlan({ ...pForm, price: Number(pForm.price), duration_days: Number(pForm.duration_days) }); toast.success('Plan created'); setShowPlan(false); setPForm(blankPlan); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  const del = async () => {
    setSaving(true)
    try { await bundleAPI.delete(deleting.id); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') } finally { setSaving(false) }
  }

  return (
    <DashboardLayout title="Bundles & Plans">
      <div className="page-header">
        <h1>Bundles & Subscriptions</h1>
        {tab === 'bundles'
          ? <button className="btn btn-primary" onClick={() => openBundle()}><Plus size={16}/> New Bundle</button>
          : <button className="btn btn-primary" onClick={() => { setPForm(blankPlan); setShowPlan(true) }}><Plus size={16}/> New Plan</button>}
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab-btn${tab === 'bundles' ? ' active' : ''}`} onClick={() => setTab('bundles')}><Package size={14}/> Course Bundles</button>
        <button className={`tab-btn${tab === 'plans' ? ' active' : ''}`} onClick={() => setTab('plans')}><Repeat size={14}/> All-Access Plans</button>
      </div>

      {loading ? <Spinner /> : tab === 'bundles' ? (
        !bundles.length ? (
          <EmptyState icon={<Package size={48}/>} title="No bundles yet"
            description="Group courses together (e.g. buy 3) for a single discounted price." />
        ) : (
          <div className="grid-3">
            {bundles.map(b => (
              <div key={b.id} className="card"><div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <h3 style={{ fontSize: 16 }}>{b.title}</h3>
                  {!b.is_active && <Badge variant="muted">inactive</Badge>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 12px' }}>{b.description}</p>
                <div style={{ fontSize: 13, marginBottom: 10 }}>
                  {(b.courses || []).length} courses
                  {Number(b.courses_total_value) > 0 && <span style={{ color: 'var(--text-muted)' }}> · worth ${Number(b.courses_total_value).toFixed(0)}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-secondary)' }}>${Number(b.price).toFixed(2)}</span>
                  <div>
                    <button className="btn btn-ghost btn-sm" onClick={() => openBundle(b)}><Edit size={13}/></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(b)}><Trash2 size={13}/></button>
                  </div>
                </div>
              </div></div>
            ))}
          </div>
        )
      ) : (
        <div className="grid-3">
          {plans.map(p => (
            <div key={p.id} className="card"><div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 16 }}>{p.name}</h3>
                {!p.is_active && <Badge variant="muted">inactive</Badge>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 12px' }}>{p.description}</p>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand-secondary)' }}>
                ${Number(p.price).toFixed(2)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/{p.interval}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{p.duration_days} days access to all courses</div>
            </div></div>
          ))}
          {!plans.length && <EmptyState icon={<Repeat size={48}/>} title="No plans yet" description="Create a monthly all-access subscription." />}
        </div>
      )}

      {/* Bundle modal */}
      <Modal open={showBundle} onClose={() => setShowBundle(false)} title={editing ? 'Edit Bundle' : 'New Bundle'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowBundle(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveBundle} disabled={saving}>{saving ? <Spinner size={16}/> : 'Save'}</button>
        </>}>
        <form onSubmit={saveBundle}>
          <div className="form-group"><label className="form-label">Title *</label>
            <input className="form-control" required value={bForm.title} onChange={e => setBForm({ ...bForm, title: e.target.value })} placeholder="Web Dev Starter Pack" /></div>
          <div className="form-group"><label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={bForm.description} onChange={e => setBForm({ ...bForm, description: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Bundle Price ($) *</label>
            <input className="form-control" type="number" min="0" step="0.01" required value={bForm.price} onChange={e => setBForm({ ...bForm, price: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Courses in this bundle</label>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
              {courses.map(c => (
                <label key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 4px', cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={bForm.course_ids.includes(c.id)} onChange={() => toggleCourse(c.id)} />
                  {c.title}
                </label>
              ))}
              {!courses.length && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No courses available.</div>}
            </div>
          </div>
        </form>
      </Modal>

      {/* Plan modal */}
      <Modal open={showPlan} onClose={() => setShowPlan(false)} title="New All-Access Plan"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowPlan(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={savePlan} disabled={saving}>{saving ? <Spinner size={16}/> : 'Save'}</button>
        </>}>
        <form onSubmit={savePlan}>
          <div className="form-group"><label className="form-label">Plan Name *</label>
            <input className="form-control" required value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} placeholder="All-Access Monthly" /></div>
          <div className="form-group"><label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} /></div>
          <div className="grid-3">
            <div className="form-group"><label className="form-label">Price ($) *</label>
              <input className="form-control" type="number" min="0" step="0.01" required value={pForm.price} onChange={e => setPForm({ ...pForm, price: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Interval</label>
              <select className="form-control" value={pForm.interval} onChange={e => setPForm({ ...pForm, interval: e.target.value })}>
                <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
              </select></div>
            <div className="form-group"><label className="form-label">Days</label>
              <input className="form-control" type="number" min="1" value={pForm.duration_days} onChange={e => setPForm({ ...pForm, duration_days: e.target.value })} /></div>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving}
        title="Delete Bundle" message={`Delete "${deleting?.title}"?`} />
    </DashboardLayout>
  )
}
