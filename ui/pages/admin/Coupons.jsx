import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, ConfirmModal, Badge, EmptyState } from '../../components/common/index.jsx'
import { couponAPI, courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Ticket } from 'lucide-react'

const blank = {
  code: '', description: '', discount_type: 'percent', discount_value: 10,
  applies_to: 'all', course_id: '', min_purchase: 0, max_uses: '', per_user_limit: 1, expires_at: '',
}

export default function Coupons() {
  const [coupons, setCoupons] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(blank)

  const load = () => couponAPI.list().then(r => setCoupons(r.data.data || [])).finally(() => setLoading(false))
  useEffect(() => {
    load()
    courseAPI.list().then(r => setCourses(r.data.data || r.data.data?.courses || [])).catch(() => {})
  }, [])

  const open = (c = null) => {
    setEditing(c)
    setForm(c ? {
      code: c.code, description: c.description || '', discount_type: c.discount_type,
      discount_value: c.discount_value, applies_to: c.applies_to, course_id: c.course_id || '',
      min_purchase: c.min_purchase || 0, max_uses: c.max_uses || '', per_user_limit: c.per_user_limit || 1,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
    } : blank)
    setShowModal(true)
  }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    const payload = {
      ...form,
      discount_value: Number(form.discount_value),
      min_purchase: Number(form.min_purchase) || 0,
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      per_user_limit: Number(form.per_user_limit) || 1,
      course_id: form.applies_to === 'course' ? form.course_id : null,
      expires_at: form.expires_at || null,
    }
    try {
      if (editing) { await couponAPI.update(editing.id, payload); toast.success('Coupon updated') }
      else { await couponAPI.create(payload); toast.success('Coupon created') }
      setShowModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const del = async () => {
    setSaving(true)
    try { await couponAPI.delete(deleting.id); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') } finally { setSaving(false) }
  }

  const fmtDiscount = c => c.discount_type === 'percent' ? `${c.discount_value}% off` : `$${c.discount_value} off`

  return (
    <DashboardLayout title="Coupons">
      <div className="page-header">
        <h1>Coupons & Promo Codes</h1>
        <button className="btn btn-primary" onClick={() => open()}><Plus size={16}/> New Coupon</button>
      </div>

      {loading ? <Spinner /> : !coupons.length ? (
        <EmptyState icon={<Ticket size={48}/>} title="No coupons yet"
          description="Create promo codes for launches, referrals, or seasonal campaigns."
          action={<button className="btn btn-primary" onClick={() => open()}><Plus size={16}/> New Coupon</button>} />
      ) : (
        <div className="table-wrap">
          <table className="table" style={{ width: '100%' }}>
            <thead><tr>
              <th>Code</th><th>Discount</th><th>Scope</th><th>Used</th><th>Source</th><th>Expires</th><th></th>
            </tr></thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.code}</strong>{c.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.description}</div>}</td>
                  <td>{fmtDiscount(c)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.applies_to === 'course' ? (c.course_title || 'Course') : c.applies_to}</td>
                  <td>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td>
                    {c.auto_source === 'manual'
                      ? <Badge variant="muted">manual</Badge>
                      : <Badge variant="primary">{c.auto_source}</Badge>}
                  </td>
                  <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => open(c)}><Edit size={13}/></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(c)}><Trash2 size={13}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Coupon' : 'New Coupon'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16}/> : 'Save'}</button>
        </>}>
        <form onSubmit={save}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Code *</label>
              <input className="form-control" required value={form.code} disabled={!!editing}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME20" /></div>
            <div className="form-group"><label className="form-label">Description</label>
              <input className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Launch promo" /></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Discount Type</label>
              <select className="form-control" value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                <option value="percent">Percent (%)</option><option value="fixed">Fixed ($)</option>
              </select></div>
            <div className="form-group"><label className="form-label">Value *</label>
              <input className="form-control" type="number" min="1" required value={form.discount_value}
                onChange={e => setForm({ ...form, discount_value: e.target.value })} /></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Applies To</label>
              <select className="form-control" value={form.applies_to} onChange={e => setForm({ ...form, applies_to: e.target.value })}>
                <option value="all">All courses</option><option value="course">One course</option><option value="bundle">A bundle</option>
              </select></div>
            {form.applies_to === 'course' && (
              <div className="form-group"><label className="form-label">Course</label>
                <select className="form-control" value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}>
                  <option value="">Select…</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select></div>
            )}
          </div>
          <div className="grid-3">
            <div className="form-group"><label className="form-label">Min Purchase ($)</label>
              <input className="form-control" type="number" min="0" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Max Uses</label>
              <input className="form-control" type="number" min="1" placeholder="∞" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Expires</label>
              <input className="form-control" type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></div>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving}
        title="Delete Coupon" message={`Delete coupon "${deleting?.code}"? This cannot be undone.`} />
    </DashboardLayout>
  )
}
