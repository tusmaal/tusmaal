import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar, Footer } from '../../components/layout/PublicLayout.jsx'
import { landingAPI } from '../../services/api'
import { useSEO } from '../../hooks/useSEO'
import { ArrowRight, GraduationCap, Building2, Trophy } from 'lucide-react'
import PublicCta from '../../components/common/PublicCta.jsx'
import { Spinner } from '../../components/common/index.jsx'

function AlumniAvatar({ name, photo }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className="alumni-ava">
      {photo ? <img src={photo} alt={name} /> : initials}
    </div>
  )
}

export default function Alumni() {
  useSEO({
    title: 'Alumni',
    description: 'Meet Tusmaal alumni — successful graduates making an impact at leading companies.',
    path: '/alumni',
  })

  const [alumni, setAlumni] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    landingAPI.alumni()
      .then(r => setAlumni(r.data.data || []))
      .catch(() => setAlumni([]))
      .finally(() => setLoading(false))
  }, [])

  const openStory = person => {
    if (person.story_pdf) window.open(person.story_pdf, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <Navbar />

      <section className="hero" style={{ minHeight: 'auto', paddingTop: 130 }}>
        <div className="hero-noise" />
        <div className="hero-grid" />
        <div className="hero-orb-1" />
        <div className="hero-orb-2" />
        <div className="pub-inner" style={{ padding: '0 5% 70px', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <div className="section-tag" style={{ display: 'inline-flex', margin: '0 auto 18px' }}><GraduationCap size={13}/> Alumni</div>
            <h1 className="hero-h1" style={{ marginBottom: 18 }}>
              Success Stories<br /><span className="hero-h1-teal">That Inspire</span>
            </h1>
            <p className="hero-desc" style={{ margin: '0 auto 34px' }}>
              Meet graduates who turned learning into real careers — working at impactful companies across Somalia and beyond.
            </p>
            {!loading && alumni.length > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999, background: 'rgba(255,157,0,0.12)', color: 'var(--brand-secondary)', fontWeight: 700, fontSize: 14, marginBottom: 24 }}>
                <GraduationCap size={16} />
                {alumni.length} success stor{alumni.length !== 1 ? 'ies' : 'y'}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/courses" className="btn btn-secondary btn-lg">
                Browse Courses <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="btn btn-ghost-white btn-lg">
                Start Learning <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pub-section pub-section-alt">
        <div className="pub-inner">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spinner /></div>
          ) : !alumni.length ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', maxWidth: 520, margin: '0 auto' }}>
              <GraduationCap size={48} color="var(--brand-secondary)" style={{ opacity: 0.5, marginBottom: 16 }} />
              <h2 className="section-h" style={{ marginBottom: 12 }}>Success Stories Coming Soon</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
                We highlight graduates who are building impactful careers. Check back soon for inspiring journeys.
              </p>
              <Link to="/courses" className="btn btn-secondary btn-lg">Browse Courses <ArrowRight size={16} /></Link>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div className="section-tag" style={{ display: 'inline-flex', margin: '0 auto 14px' }}><Trophy size={13}/> Where They Work</div>
                <h2 className="section-h">Our Alumni in Action</h2>
                <p className="section-sub" style={{ margin: '0 auto' }}>
                  Click a profile to open their success story.
                </p>
              </div>
              <div className="alumni-grid">
                {alumni.map(person => (
                  <button
                    key={person.id}
                    type="button"
                    className="alumni-card alumni-card-clickable"
                    onClick={() => openStory(person)}
                    aria-label={`Open success story for ${person.full_name}`}
                  >
                    <AlumniAvatar name={person.full_name} photo={person.photo} />
                    <div className="alumni-name">{person.full_name}</div>
                    <div className="alumni-company">
                      <Building2 size={14} />
                      {person.company}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <PublicCta altSection />

      <Footer />
    </div>
  )
}
