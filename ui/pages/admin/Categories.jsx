import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, ConfirmModal } from '../../components/common/index.jsx'
import { categoryAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { CategoryIcon } from '../../config/categoryIcons'

const ICONS = ['laptop','briefcase','book','globe','calculator','stethoscope','heart','star','music','flask','pencil']

export default function Categories() {
  const [cats, setCats] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', icon: 'book' })

  const load = () => categoryAPI.list().then(r => setCats(r.data.data || []))
  useEffect(() => { load() }, [])

  const open = (cat = null) => { setEditing(cat); setForm(cat ? { name: cat.name, description: cat.description || '', icon: cat.icon || 'book' } : { name: '', description: '', icon: 'book' }); setShowModal(true) }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await categoryAPI.update(editing.id, form); toast.success('Updated!') }
      else { await categoryAPI.create(form); toast.success('Created!') }
      setShowModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const del = async () => {
    setSaving(true)
    try { await categoryAPI.delete(deleting.id); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <DashboardLayout title="Categories">
      <div className="page-header">
        <h1>Categories</h1>
        <button className="btn btn-primary" onClick={() => open()}><Plus size={16}/> Add Category</button>
      </div>

      <div className="grid-4">
        {cats.map(c => (
          <div key={c.id} className="card">
            <div className="card-body" style={{ textAlign: 'center' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom: 10, color:'var(--brand-secondary)' }}><CategoryIcon name={c.icon} size={32}/></div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{c.course_count} courses</div>
              {c.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{c.description}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => open(c)}><Edit size={13}/></button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(c)}><Trash2 size={13}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Add Category'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16}/> : 'Save'}</button>
        </>}>
        <form onSubmit={save}>
          <div className="form-group"><label className="form-label">Name *</label><input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></div>
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })}
                  style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${form.icon === ic ? 'var(--brand-secondary)' : 'var(--border)'}`, background: form.icon === ic ? 'rgba(255,157,0,0.12)' : 'var(--bg)', color: 'var(--brand-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CategoryIcon name={ic} size={18}/>
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving} title="Delete Category" message={`Delete "${deleting?.name}"? Courses in this category will be uncategorized.`}/>
    </DashboardLayout>
  )
}
