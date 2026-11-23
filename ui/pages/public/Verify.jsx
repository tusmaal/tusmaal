import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Navbar, Footer } from '../../components/layout/PublicLayout.jsx'
import { landingAPI } from '../../services/api'
import { useSEO } from '../../hooks/useSEO'
import { Spinner } from '../../components/common/index.jsx'
import { ShieldCheck, ShieldX, Search, Award, Calendar, BookOpen, Hash } from 'lucide-react'

function CertAvatar({ name, photo }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className="verify-avatar">
      {photo ? <img src={photo} alt={name} /> : initials}
    </div>
  )
}

export default function Verify() {
  useSEO({
    title: 'Verify Certificate',
    description: 'Verify the authenticity of an Tusmaal Academy certificate using its serial number or QR code.',
    path: '/verify',
  })

  const [searchParams, setSearchParams] = useSearchParams()
  const [serial, setSerial] = useState(searchParams.get('cert') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const lookup = async (num) => {
    const trimmed = (num || '').trim()
    if (!trimmed) {
      setError('Please enter a certificate serial number.')
      setResult(null)
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await landingAPI.verifyCert(encodeURIComponent(trimmed))
      if (r.data.valid) {
        setResult(r.data.data)
        setSearchParams({ cert: trimmed }, { replace: true })
      } else {
        setError(r.data.message || 'Certificate not found.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Certificate not found. Please check the serial number and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = searchParams.get('cert')
    if (q) {
      setSerial(q)
      lookup(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = e => {
    e.preventDefault()
    lookup(serial)
  }

  const issuedDate = result?.issued_at
    ? new Date(result.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="verify-page">
      <Navbar />

      <section className="hero" style={{ minHeight: 'auto', paddingTop: 130 }}>
        <div className="hero-noise" />
        <div className="hero-grid" />
        <div className="hero-orb-1" />
        <div className="hero-orb-2" />
        <div className="pub-inner" style={{ padding: '0 5% 70px', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <div className="section-tag" style={{ display: 'inline-flex', margin: '0 auto 18px' }}>
              <ShieldCheck size={14} style={{ marginRight: 6 }} /> Verify Certificate
            </div>
            <h1 className="hero-h1" style={{ marginBottom: 18 }}>
              Confirm Certificate<br /><span className="hero-h1-teal">Authenticity</span>
            </h1>
            <p className="hero-desc" style={{ margin: '0 auto 34px' }}>
              Enter the serial number from an Tusmaal certificate, or scan the QR code on the PDF to verify it is genuine.
            </p>
          </div>
        </div>
      </section>

      <section className="pub-section pub-section-alt" style={{ paddingTop: 60, paddingBottom: 90 }}>
        <div className="pub-inner" style={{ maxWidth: 640 }}>
          <form onSubmit={onSubmit} className="verify-search">
            <div className="verify-search-field">
              <Hash size={18} className="verify-search-icon" />
              <input
                className="form-control"
                type="text"
                placeholder="e.g. 00008"
                value={serial}
                onChange={e => setSerial(e.target.value)}
                aria-label="Certificate serial number"
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={loading}>
              {loading ? <Spinner size={16} /> : <><Search size={16} /> Verify</>}
            </button>
          </form>

          {loading && !result && (
            <div className="verify-status verify-status-loading">
              <Spinner size={24} />
              <p>Checking certificate…</p>
            </div>
          )}

          {error && !loading && (
            <div className="verify-status verify-status-invalid">
              <ShieldX size={40} color="var(--danger)" />
              <h3>Not Verified</h3>
              <p>{error}</p>
            </div>
          )}

          {result && !loading && (
            <div className="verify-result">
              <div className="verify-result-badge">
                <ShieldCheck size={18} />
                Authentic Tusmaal Certificate
              </div>
              <CertAvatar name={result.student_name} photo={result.student_photo} />
              <h2 className="verify-result-name">{result.student_name}</h2>
              <div className="verify-result-grid">
                <div className="verify-result-item">
                  <BookOpen size={16} />
                  <div>
                    <span>Course</span>
                    <strong>{result.course_title}</strong>
                  </div>
                </div>
                <div className="verify-result-item">
                  <Hash size={16} />
                  <div>
                    <span>Serial Number</span>
                    <strong>{result.certificate_number}</strong>
                  </div>
                </div>
                <div className="verify-result-item">
                  <Calendar size={16} />
                  <div>
                    <span>Issued On</span>
                    <strong>{issuedDate}</strong>
                  </div>
                </div>
                {result.teacher_name && (
                  <div className="verify-result-item">
                    <Award size={16} />
                    <div>
                      <span>Instructor</span>
                      <strong>{result.teacher_name}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="verify-footnote">
            Certificates issued before our online system may use different serial formats.
            If you need help, <Link to="/contact">contact us</Link>.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
