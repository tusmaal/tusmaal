import { useEffect, useState, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, ConfirmModal, Badge, EmptyState, Avatar } from '../../components/common/index.jsx'
import { alumniAdminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, GraduationCap, Camera, FileText, ExternalLink, Building2 } from 'lucide-react'

const blank = {
  full_name: '',
  company: '',
  order_index: 0,
  is_published: true,
}

export default function AdminAlumni() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(blank)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [pdfName, setPdfName] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const photoRef = useRef(null)
  const pdfRef = useRef(null)

  const load = () => alumniAdminAPI.list().then(r => setItems(r.data.data || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const open = (item = null) => {
    setEditing(item)
    setForm(item ? {
      full_name: item.full_name,
      company: item.company,
      order_index: item.order_index,
      is_published: item.is_published,
    } : blank)
    setPhotoPreview(item?.photo || null)
    setPhotoFile(null)
    setPdfName(item?.story_pdf ? item.story_pdf.split('/').pop() : '')
    setPdfFile(null)
    setShowModal(true)
  }

  const onPhotoChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const onPdfChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Please choose a PDF file')
      return
    }
    setPdfFile(file)
    setPdfName(file.name)
  }

  const save = async e => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.company.trim()) {
      toast.error('Name and company are required')
      return
    }
    if (!editing && !pdfFile) {
      toast.error('Success story PDF is required')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('full_name', form.full_name.trim())
      fd.append('company', form.company.trim())
      fd.append('order_index', String(Number(form.order_index) || 0))
      fd.append('is_published', String(form.is_published))
      if (photoFile) fd.append('photo', photoFile)
      if (pdfFile) fd.append('story_pdf', pdfFile)

      if (editing) {
        await alumniAdminAPI.update(editing.id, fd)
        toast.success('Alumni spotlight updated')
      } else {
        await alumniAdminAPI.create(fd)
        toast.success('Alumni spotlight added')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    setSaving(true)
    try {
      await alumniAdminAPI.delete(deleting.id)
      toast.success('Removed')
      setDeleting(null)
      load()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Alumni">
      <div className="page-header">
        <div>
          <h1>Alumni Success Stories</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Curate graduates working at impactful companies. Visitors click a profile to open their journey PDF.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => open()}>
          <Plus size={16} /> Add Alumni
        </button>
      </div>

      {loading ? (
        <div className="loading-screen"><Spinner /></div>
      ) : !items.length ? (
        <EmptyState
          icon={<GraduationCap size={40} />}
          title="No alumni spotlights yet"
          description="Add successful graduates with their photo, company, and a PDF about their career journey."
          action={<button className="btn btn-secondary" onClick={() => open()}>Add first alumni</button>}
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Company</th>
                  <th>Story PDF</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar user={{ full_name: item.full_name, profile_photo: item.photo }} size={40} />
                        <span style={{ fontWeight: 600 }}>{item.full_name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={14} color="var(--brand-secondary)" />
                        {item.company}
                      </span>
                    </td>
                    <td>
                      <a href={item.story_pdf} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                        <FileText size={14} /> View PDF
                      </a>
                    </td>
                    <td>{item.order_index}</td>
                    <td>
                      <Badge variant={item.is_published ? 'success' : 'muted'}>
                        {item.is_published ? 'Published' : 'Hidden'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => open(item)} title="Edit">
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(item)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Alumni Spotlight' : 'Add Alumni Spotlight'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" form="alumni-form" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner size={16} /> : 'Save'}
            </button>
          </>
        }
      >
        <form id="alumni-form" onSubmit={save}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative' }}>
              <Avatar user={{ full_name: form.full_name || '?', profile_photo: photoPreview }} size={88} />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ position: 'absolute', right: -4, bottom: -4, borderRadius: '50%', width: 36, height: 36, padding: 0, minHeight: 36 }}
                onClick={() => photoRef.current?.click()}
                aria-label="Upload photo"
              >
                <Camera size={16} />
              </button>
            </div>
            <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhotoChange} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Student photo (recommended)</p>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-control" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Company / Workplace *</label>
            <input className="form-control" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="e.g. Hormuud Telecom" required />
          </div>

          <div className="form-group">
            <label className="form-label">Success Story PDF {!editing && '*'}</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" onClick={() => pdfRef.current?.click()}>
                <FileText size={15} /> {pdfName || 'Choose PDF'}
              </button>
              {editing?.story_pdf && !pdfFile && (
                <a href={editing.story_pdf} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  <ExternalLink size={14} /> Current PDF
                </a>
              )}
            </div>
            <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={onPdfChange} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
              Upload their career journey, portfolio, or success story. Opens when visitors click their profile.
            </p>
          </div>

          <div className="grid-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Display Order</label>
              <input className="form-control" type="number" min="0" value={form.order_index} onChange={e => setForm(p => ({ ...p, order_index: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Published</label>
              <select className="form-control" value={String(form.is_published)} onChange={e => setForm(p => ({ ...p, is_published: e.target.value === 'true' }))}>
                <option value="true">Published</option>
                <option value="false">Hidden</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={del}
        title="Remove alumni spotlight?"
        message={`Remove ${deleting?.full_name} from the public Alumni page?`}
        confirmLabel="Remove"
        loading={saving}
      />
    </DashboardLayout>
  )
}
