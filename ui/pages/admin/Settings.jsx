import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Spinner, Badge } from '../../components/common/index.jsx'
import { settingsAPI, landingAPI, certificateAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Save, Users, BookOpen, Award, GraduationCap, ShieldCheck, RefreshCw, Download } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [realStats, setRealStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [previewForm, setPreviewForm] = useState({
    studentName: 'Hamdi Artan Haashi',
    courseName: 'Visual Graphic Design',
    certificateNumber: '00008',
  })
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      settingsAPI.get().then(r => r.data.data || {}),
      landingAPI.get().then(r => r.data.data?.stats_real || null)
    ])
      .then(([s, rs]) => { setSettings(s); setRealStats(rs) })
      .finally(() => setLoading(false))
  }, [])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await settingsAPI.update(settings)
      toast.success('Settings saved!')
      const rs = (await landingAPI.get()).data.data?.stats_real
      if (rs) setRealStats(rs)
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }))
  const useMock = settings.stats_use_mock === true || settings.stats_use_mock === 'true'

  const regenerateAllCerts = async () => {
    if (!window.confirm('Regenerate PDF files for all certificates? This updates the design and QR codes but keeps existing serial numbers.')) return
    setRegenerating(true)
    try {
      const r = await certificateAPI.regenerateAll()
      toast.success(r.data.message || 'Certificates regenerated.')
    } catch {
      toast.error('Failed to regenerate certificates.')
    } finally {
      setRegenerating(false)
    }
  }

  const downloadPreview = async () => {
    if (!previewForm.studentName.trim() || !previewForm.courseName.trim()) {
      toast.error('Enter a student name and course name.')
      return
    }
    setPreviewLoading(true)
    try {
      const r = await certificateAPI.preview({
        studentName: previewForm.studentName.trim(),
        courseName: previewForm.courseName.trim(),
        certificateNumber: previewForm.certificateNumber.trim() || '00000',
      })
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-preview-${previewForm.certificateNumber.trim() || '00000'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Preview certificate downloaded.')
    } catch {
      toast.error('Failed to generate preview certificate.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const field = (key, label, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-control" type={type} placeholder={placeholder} value={settings[key] ?? ''} onChange={e => set(key, e.target.value)}/>
    </div>
  )

  const mockField = (key, label, icon) => (
    <div className="form-group">
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon} {label}
      </label>
      <input
        className="form-control"
        type="number"
        min="0"
        value={settings[key] ?? ''}
        onChange={e => set(key, e.target.value)}
        disabled={!useMock}
      />
    </div>
  )

  if (loading) return <DashboardLayout title="Settings"><div className="loading-screen"><div className="spinner"/></div></DashboardLayout>

  return (
    <DashboardLayout title="Site Settings">
      <div className="page-header">
        <h1>Site Settings</h1>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <Spinner size={16}/> : <><Save size={15}/> Save Changes</>}
        </button>
      </div>

      <div className="grid-2">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 6 }}>Homepage Statistics</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Control the student, course, certificate, and instructor counts shown on the public homepage hero.
                </p>
              </div>
              <Badge variant={useMock ? 'success' : 'muted'}>
                {useMock ? 'Showing mockup numbers' : 'Showing real numbers'}
              </Badge>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${!useMock ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => set('stats_use_mock', false)}
              >
                Real Students
              </button>
              <button
                type="button"
                className={`btn ${useMock ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => set('stats_use_mock', true)}
              >
                Mockup Numbers
              </button>
            </div>

            {realStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24, padding: 16, background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Real — Students</div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{realStats.total_students}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Real — Courses</div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{realStats.total_courses}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Real — Certificates</div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{realStats.certificates_issued}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Real — Instructors</div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{realStats.total_teachers}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {mockField('mock_total_students', 'Mock Students', <Users size={14}/>)}
              {mockField('mock_total_courses', 'Mock Courses', <BookOpen size={14}/>)}
              {mockField('mock_certificates_issued', 'Mock Certificates', <Award size={14}/>)}
              {mockField('mock_total_teachers', 'Mock Instructors', <GraduationCap size={14}/>)}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, marginBottom: 0 }}>
              {useMock
                ? 'Visitors will see the mockup numbers above on the homepage.'
                : 'Visitors will see live counts from your database (students, published courses, certificates, active teachers).'}
            </p>
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} /> Certificates
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Control serial numbers for new certificates and PDF appearance. PDFs use the Tusmaal template in <code style={{ fontSize: 12 }}>assets/certificate-template.png</code> with Dancing Script + Metropolis fonts. Set the next serial if you already issued certificates offline (e.g. 01–07 used → set next to 8 for 00008).
                </p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={regenerateAllCerts} disabled={regenerating}>
                {regenerating ? <Spinner size={16} /> : <><RefreshCw size={15} /> Regenerate All PDFs</>}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Next Serial Number</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={settings.certificate_serial_next ?? ''}
                  onChange={e => set('certificate_serial_next', e.target.value)}
                  placeholder="8"
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>
                  The next certificate issued will use this number, then increment automatically.
                </p>
              </div>
              {field('certificate_serial_padding', 'Serial Padding (digits)', 'number', '5')}
              {field('certificate_academy_name', 'Academy Name on Certificate', 'text', 'Aqoonjire Academy')}
              {field('certificate_director_name', 'Director Signature Name', 'text', 'Amin Ahmed Abdi')}
              {field('certificate_director_title', 'Director Title', 'text', 'Academic Director')}
            </div>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Preview certificate</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Generate a sample PDF with any name and course — nothing is saved to the database.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Student name</label>
                  <input
                    className="form-control"
                    value={previewForm.studentName}
                    onChange={e => setPreviewForm(p => ({ ...p, studentName: e.target.value }))}
                    placeholder="Student full name"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Course name</label>
                  <input
                    className="form-control"
                    value={previewForm.courseName}
                    onChange={e => setPreviewForm(p => ({ ...p, courseName: e.target.value }))}
                    placeholder="Course title"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Serial number (sample)</label>
                  <input
                    className="form-control"
                    value={previewForm.certificateNumber}
                    onChange={e => setPreviewForm(p => ({ ...p, certificateNumber: e.target.value }))}
                    placeholder="00008"
                  />
                </div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={downloadPreview} disabled={previewLoading}>
                {previewLoading ? <Spinner size={16} /> : <><Download size={15} /> Download Preview PDF</>}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Platform Identity</h3>
            {field('platform_name', 'Platform Name', 'text', 'Tusmaal')}
            {field('platform_tagline', 'Tagline', 'text', 'Quality Education for Everyone')}
            {field('primary_color', 'Primary Color', 'color')}
            {field('logo_url', 'Logo URL', 'url')}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Homepage Hero</h3>
            {field('hero_title', 'Hero Title', 'text', 'Learn New Skills Online')}
            {field('hero_subtitle', 'Hero Subtitle', 'text')}
            {field('hero_image_url', 'Hero Image URL', 'url')}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Contact Information</h3>
            {field('contact_email', 'Email', 'email', 'info@tusmaalinstitute.org')}
            {field('contact_phone', 'Phone', 'tel', '+252 61 7090076')}
            {field('contact_address', 'Address', 'text', 'Mogadishu, Somalia')}
            {field('whatsapp_number', 'WhatsApp Number', 'tel', '+252 61 7090076')}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Social & Other</h3>
            {field('facebook_url', 'Facebook URL', 'url')}
            {field('twitter_url', 'Twitter/X URL', 'url')}
            {field('currency_default', 'Default Currency', 'text', 'USD')}
            <div className="form-group">
              <label className="form-label">About Text</label>
              <textarea className="form-control" rows={3} value={settings.about_text || ''} onChange={e => set('about_text', e.target.value)} placeholder="Write a short description about the platform..."/>
            </div>
            {field('footer_text', 'Footer Text', 'text')}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
