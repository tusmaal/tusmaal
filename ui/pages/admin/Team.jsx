import { useEffect, useState, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, ConfirmModal, Badge, EmptyState, Avatar } from '../../components/common/index.jsx'
import { teamAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, UsersRound, Camera, Share2, Facebook, Linkedin, Instagram } from 'lucide-react'

const TikTokIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M16.5 3c.3 2.1 1.6 3.6 3.5 3.85v2.3c-1.2.1-2.4-.2-3.5-.83v5.93c0 3-2.1 5.32-5 5.32s-5-2.3-5-5.12 2.4-5.12 5.3-4.92v2.42c-.3-.1-.6-.13-.9-.13-1.4 0-2.5 1.13-2.5 2.63s1.1 2.6 2.5 2.6 2.6-1.2 2.6-2.7V3h2.5z"/>
  </svg>
)

const SOCIAL_FIELDS = [
  { key: 'social_facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/...' },
  { key: 'social_linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/...' },
  { key: 'social_instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/...' },
  { key: 'social_tiktok', label: 'TikTok', icon: TikTokIcon, placeholder: 'https://tiktok.com/@...' },
]

const blank = {
  full_name: '', role: '', bio: '', order_index: 0, is_published: true,
  social_facebook: '', social_linkedin: '', social_instagram: '', social_tiktok: '',
}

export default function Team() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(blank)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const fileRef = useRef(null)

  const load = () => teamAPI.list().then(r => setMembers(r.data.data || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const open = (member = null) => {
    setEditing(member)
    setForm(member ? {
      full_name: member.full_name,
      role: member.role,
      bio: member.bio || '',
      order_index: member.order_index,
      is_published: member.is_published,
      social_facebook: member.social_facebook || '',
      social_linkedin: member.social_linkedin || '',
      social_instagram: member.social_instagram || '',
      social_tiktok: member.social_tiktok || '',
    } : blank)
    setPhotoPreview(member?.photo || null)
    setPhotoFile(null)
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

  const save = async e => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.role.trim()) {
      toast.error('Name and role are required')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('full_name', form.full_name.trim())
      fd.append('role', form.role.trim())
      fd.append('bio', form.bio.trim())
      fd.append('order_index', String(Number(form.order_index) || 0))
      fd.append('is_published', String(form.is_published))
      SOCIAL_FIELDS.forEach(({ key }) => fd.append(key, form[key].trim()))
      if (photoFile) fd.append('photo', photoFile)

      if (editing) {
        await teamAPI.update(editing.id, fd)
        toast.success('Team member updated')
      } else {
        await teamAPI.create(fd)
        toast.success('Team member added')
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
      await teamAPI.delete(deleting.id)
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
    <DashboardLayout title="Team">
      <div className="page-header">
        <div>
          <h1>Meet the Team</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Manage team members shown on the About Us page.
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => open()}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      {loading ? <Spinner /> : !members.length ? (
        <EmptyState
          icon={<UsersRound size={48} />}
          title="No team members yet"
          description="Add your founders, instructors, and staff to appear on the About page."
          action={
            <button className="btn btn-primary" type="button" onClick={() => open()}>
              <Plus size={16} /> Add Member
            </button>
          }
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>Order</th>
                  <th style={{ width: 56 }}></th>
                  <th>Name</th>
                  <th>Role</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{m.order_index}</td>
                    <td>
                      <Avatar user={{ full_name: m.full_name, profile_photo: m.photo }} size={36} />
                    </td>
                    <td>
                      <strong>{m.full_name}</strong>
                      {m.bio && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.bio}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--brand-secondary)', fontWeight: 600 }}>{m.role}</td>
                    <td>
                      <Badge variant={m.is_published ? 'success' : 'muted'}>
                        {m.is_published ? 'Published' : 'Hidden'}
                      </Badge>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => open(m)}><Edit size={13} /></button>
                      <button className="btn btn-ghost btn-sm" type="button" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(m)}><Trash2 size={13} /></button>
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
        title={editing ? 'Edit Team Member' : 'Add Team Member'}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>
              {saving ? <Spinner size={16} /> : 'Save'}
            </button>
          </>
        }
      >
        <form onSubmit={save}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              <Avatar user={{ full_name: form.full_name || '?', profile_photo: photoPreview }} size={88} />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ position: 'absolute', right: -4, bottom: -4, borderRadius: '50%', width: 34, height: 34, padding: 0, minHeight: 34 }}
                onClick={() => fileRef.current?.click()}
                aria-label="Upload photo"
              >
                <Camera size={14} />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhotoChange} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Profile photo</span>
          </div>

          <div className="form-group">
            <label className="form-label">Full name *</label>
            <input className="form-control" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Amin Ahmed Abdi" />
          </div>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <input className="form-control" required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Founder & CEO" />
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea className="form-control" rows={4} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Short introduction…" />
          </div>

          <div className="form-group">
            <label className="form-label"><Share2 size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Social links</label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Optional — icons show on their About page card.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SOCIAL_FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key}>
                  <label className="form-label" style={{ fontSize: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={14} /> {label}
                  </label>
                  <input
                    className="form-control"
                    type="url"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Display order</label>
              <input className="form-control" type="number" min="0" value={form.order_index} onChange={e => setForm({ ...form, order_index: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.is_published ? 'true' : 'false'} onChange={e => setForm({ ...form, is_published: e.target.value === 'true' })}>
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
        title="Remove team member?"
        message={`Remove ${deleting?.full_name} from the About page?`}
        loading={saving}
      />
    </DashboardLayout>
  )
}
