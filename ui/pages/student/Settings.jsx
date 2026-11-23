import { useEffect, useState, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { LoadingScreen, Avatar } from '../../components/common/index.jsx'
import { authAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Save, Camera, User, FileText, Award, Share2, Facebook, Linkedin, Instagram } from 'lucide-react'

const TikTokIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M16.5 3c.3 2.1 1.6 3.6 3.5 3.85v2.3c-1.2.1-2.4-.2-3.5-.83v5.93c0 3-2.1 5.32-5 5.32s-5-2.3-5-5.12 2.4-5.12 5.3-4.92v2.42c-.3-.1-.6-.13-.9-.13-1.4 0-2.5 1.13-2.5 2.63s1.1 2.6 2.5 2.6 2.6-1.2 2.6-2.7V3h2.5z"/>
  </svg>
)

const SOCIAL_FIELDS = [
  { key: 'social_facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/yourprofile' },
  { key: 'social_linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/yourprofile' },
  { key: 'social_instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/yourprofile' },
  { key: 'social_tiktok', label: 'TikTok', icon: TikTokIcon, placeholder: 'https://tiktok.com/@yourprofile' },
]

export default function StudentSettings() {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [socials, setSocials] = useState({
    social_facebook: '',
    social_linkedin: '',
    social_instagram: '',
    social_tiktok: '',
  })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    authAPI.me()
      .then(r => {
        const u = r.data.data
        setDisplayName(u.display_name || '')
        setBio(u.bio || '')
        setSocials({
          social_facebook: u.social_facebook || '',
          social_linkedin: u.social_linkedin || '',
          social_instagram: u.social_instagram || '',
          social_tiktok: u.social_tiktok || '',
        })
        setPhotoPreview(u.profile_photo || null)
        updateUser(u)
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

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
    if (!bio.trim()) {
      toast.error('Bio is required to appear on the Alumni page')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('display_name', displayName.trim())
      fd.append('bio', bio.trim())
      SOCIAL_FIELDS.forEach(({ key }) => fd.append(key, socials[key].trim()))
      if (photoFile) fd.append('photo', photoFile)
      const r = await authAPI.updateProfile(fd)
      updateUser(r.data.data)
      setPhotoFile(null)
      toast.success('Profile saved!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <DashboardLayout title="Settings"><LoadingScreen text="Loading profile…" /></DashboardLayout>

  return (
    <DashboardLayout title="Settings">
      <div style={{ maxWidth: 640 }}>
        <div className="card card-body" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Award size={18} color="var(--brand-secondary)" />
            <h2 style={{ fontSize: 18, margin: 0 }}>Your Profile</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Add a display name, photo, bio, and social links for your student profile and certificates.
          </p>
        </div>

        <form onSubmit={save} className="card card-body">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative' }}>
              <Avatar user={{ ...user, profile_photo: photoPreview || user?.profile_photo, full_name: displayName || user?.full_name }} size={96} />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ position: 'absolute', right: -4, bottom: -4, borderRadius: '50%', width: 36, height: 36, padding: 0, minHeight: 36 }}
                onClick={() => fileRef.current?.click()}
                aria-label="Upload profile photo"
              >
                <Camera size={16} />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhotoChange} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>Profile photo</span>
          </div>

          <div className="form-group">
            <label className="form-label"><User size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Display name</label>
            <input
              className="form-control"
              placeholder={user?.full_name || 'How you want to appear on Alumni'}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
              Shown on the Alumni page. Leave blank to use your account name ({user?.full_name}).
            </span>
          </div>

          <div className="form-group">
            <label className="form-label"><FileText size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Bio</label>
            <textarea
              className="form-control"
              rows={5}
              placeholder="Tell us about yourself, your skills, and what you've learned…"
              value={bio}
              onChange={e => setBio(e.target.value)}
              required
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
              Required to appear on the Alumni page after you earn a certificate.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label"><Share2 size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Social links</label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>
              Optional — icons appear on your Alumni card when you add a link.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SOCIAL_FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key}>
                  <label className="form-label" style={{ fontSize: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={14} /> {label}
                  </label>
                  <input
                    className="form-control"
                    type="url"
                    placeholder={placeholder}
                    value={socials[key]}
                    onChange={e => setSocials(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-secondary" disabled={saving} style={{ minHeight: 44 }}>
            {saving ? 'Saving…' : <><Save size={16} /> Save Profile</>}
          </button>
        </form>
      </div>
    </DashboardLayout>
  )
}
