import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, ConfirmModal, Badge, EmptyState } from '../../components/common/index.jsx'
import { siteFaqAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, HelpCircle } from 'lucide-react'

const blank = { question: '', answer: '', category: 'General', order_index: 0, is_published: true }

export default function FAQs() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(blank)

  const load = () => siteFaqAPI.list().then(r => setFaqs(r.data.data || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const open = (f = null) => {
    setEditing(f)
    setForm(f ? {
      question: f.question, answer: f.answer, category: f.category,
      order_index: f.order_index, is_published: f.is_published,
    } : blank)
    setShowModal(true)
  }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    const payload = { ...form, order_index: Number(form.order_index) || 0, category: form.category.trim() || 'General' }
    try {
      if (editing) { await siteFaqAPI.update(editing.id, payload); toast.success('FAQ updated') }
      else { await siteFaqAPI.create(payload); toast.success('FAQ created') }
      setShowModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const del = async () => {
    setSaving(true)
    try { await siteFaqAPI.delete(deleting.id); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') } finally { setSaving(false) }
  }

  // Group by category for display
  const grouped = faqs.reduce((acc, f) => { (acc[f.category] = acc[f.category] || []).push(f); return acc }, {})

  return (
    <DashboardLayout title="FAQs">
      <div className="page-header">
        <div>
          <h1>Help Center FAQs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage the questions shown on your public FAQ page.</p>
        </div>
        <button className="btn btn-primary" onClick={() => open()}><Plus size={16} /> New FAQ</button>
      </div>

      {loading ? <Spinner /> : !faqs.length ? (
        <EmptyState icon={<HelpCircle size={48} />} title="No FAQs yet"
          description="Add common questions like enrollment, payment and certificates."
          action={<button className="btn btn-primary" onClick={() => open()}><Plus size={16} /> New FAQ</button>} />
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', margin: '0 0 10px' }}>{cat}</div>
            <div className="card">
              <div className="table-wrap">
                <table className="table" style={{ width: '100%' }}>
                  <thead><tr>
                    <th style={{ width: 60 }}>Order</th><th>Question</th><th style={{ width: 110 }}>Status</th><th style={{ width: 100 }}></th>
                  </tr></thead>
                  <tbody>
                    {items.map(f => (
                      <tr key={f.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{f.order_index}</td>
                        <td>
                          <strong>{f.question}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 560, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.answer}</div>
                        </td>
                        <td><Badge variant={f.is_published ? 'success' : 'muted'}>{f.is_published ? 'Published' : 'Hidden'}</Badge></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => open(f)}><Edit size={13} /></button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(f)}><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit FAQ' : 'New FAQ'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} /> : 'Save'}</button>
        </>}>
        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Question *</label>
            <input className="form-control" required value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="How do I enroll in a course?" />
          </div>
          <div className="form-group">
            <label className="form-label">Answer *</label>
            <textarea className="form-control" rows={5} required value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} placeholder="Write a clear, friendly answer…" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="form-control" list="faq-cats" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Payments" />
              <datalist id="faq-cats">
                {['Getting Started', 'Courses & Enrollment', 'Payments', 'Certificates', 'Account', 'General'].map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Order</label>
              <input className="form-control" type="number" min="0" value={form.order_index} onChange={e => setForm({ ...form, order_index: e.target.value })} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} />
            Published (visible on the public FAQ page)
          </label>
        </form>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving}
        title="Delete FAQ" message={`Delete this FAQ? This cannot be undone.`} />
    </DashboardLayout>
  )
}
