import { WHATSAPP_HREF } from '../../utils/whatsapp'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar, Footer } from '../../components/layout/PublicLayout.jsx'
import FaqAccordion from '../../components/common/FaqAccordion.jsx'
import { siteFaqAPI } from '../../services/api'
import { useSEO } from '../../hooks/useSEO'
import { Search, MessageCircle, ArrowRight, HelpCircle } from 'lucide-react'

export default function FAQ() {
  useSEO({
    title: 'FAQ — Help Center',
    description: 'Answers to common questions about Tusmaal: how to enroll, payment methods, course access, certificates and more.',
    path: '/faq',
  })
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('All')

  useEffect(() => {
    siteFaqAPI.publicList()
      .then(r => setFaqs(r.data.data || []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => ['All', ...Array.from(new Set(faqs.map(f => f.category)))], [faqs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return faqs.filter(f =>
      (activeCat === 'All' || f.category === activeCat) &&
      (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
    )
  }, [faqs, search, activeCat])

  return (
    <div>
      <Navbar />

      <section className="hero" style={{ minHeight: 'auto', paddingTop: 130 }}>
        <div className="hero-noise" />
        <div className="hero-grid" />
        <div className="hero-orb-1" />
        <div className="hero-orb-2" />
        <div className="pub-inner" style={{ padding: '0 5% 60px', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <div className="section-tag" style={{ display: 'inline-flex', margin: '0 auto 18px' }}>Help Center</div>
            <h1 className="hero-h1" style={{ marginBottom: 18 }}>Frequently Asked<br /><span className="hero-h1-teal">Questions</span></h1>
            <p className="hero-desc" style={{ margin: '0 auto 30px' }}>
              Everything you need to know about accounts, courses, payments and certificates.
            </p>
            <div className="search-bar" style={{ maxWidth: 520, margin: '0 auto', background: 'rgba(255,255,255,0.95)' }}>
              <Search size={18} />
              <input placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      <section className="pub-section pub-section-alt" style={{ paddingTop: 50 }}>
        <div className="pub-inner" style={{ maxWidth: 860, margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                className={`tab-btn${activeCat === cat ? ' active' : ''}`}
                style={{ borderRadius: 999, padding: '8px 18px' }}>{cat}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : !filtered.length ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <HelpCircle size={44} style={{ opacity: 0.4, marginBottom: 12 }} />
              <p>No questions found{search ? ` for "${search}"` : ''}. Try a different search or contact us.</p>
            </div>
          ) : (
            <FaqAccordion faqs={filtered} />
          )}

          <div className="card" style={{ marginTop: 40, padding: 32, textAlign: 'center' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Still have questions?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Our team is one message away — we usually reply fast.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="btn btn-secondary btn-lg">
                WhatsApp Us <MessageCircle size={16} />
              </a>
              <Link to="/contact" className="btn btn-ghost btn-lg">Contact Page <ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
