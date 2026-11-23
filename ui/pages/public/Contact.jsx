import { WHATSAPP_HREF } from '../../utils/whatsapp'
import { CONTACT } from '../../config/brandAssets'
import { Link } from 'react-router-dom'
import { Navbar, Footer } from '../../components/layout/PublicLayout.jsx'
import { useSEO } from '../../hooks/useSEO'
import { ArrowRight, Mail, Phone, MapPin, Clock, MessageCircle, CheckCircle, Send } from 'lucide-react'
import PublicCta from '../../components/common/PublicCta.jsx'

export default function Contact() {
  useSEO({
    title: 'Contact Us',
    description: 'Get in touch with Tusmaal about courses, payments, and enrollment.',
    path: '/contact',
  })
  return (
    <div className="contact-page">
      <Navbar />

      <section className="hero" style={{ minHeight: 'auto', paddingTop: 130 }}>
        <div className="hero-noise" />
        <div className="hero-grid" />
        <div className="hero-orb-1" />
        <div className="hero-orb-2" />

        <div className="pub-inner" style={{ padding: '0 5% 70px', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <div className="section-tag" style={{ display: 'inline-flex', margin: '0 auto 18px' }}><Mail size={13}/> Contact Us</div>
            <h1 className="hero-h1" style={{ marginBottom: 18 }}>Let's Talk About<br /><span className="hero-h1-teal">Your Learning Goals</span></h1>
            <p className="hero-desc" style={{ margin: '0 auto 34px' }}>
              Have a question about courses, payments, or enrollment? Our team is here to help you start learning quickly.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="btn btn-secondary btn-lg">
                WhatsApp Us <MessageCircle size={16} />
              </a>
              <Link to="/courses" className="btn btn-ghost-white btn-lg">
                Browse Courses <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pub-section pub-section-alt" style={{ paddingTop: 70 }}>
        <div className="pub-inner">
          <div className="grid-3">
            <div className="card card-body">
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,157,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Mail color="var(--brand-secondary)" size={22} />
              </div>
              <h3 style={{ marginBottom: 8 }}>Email Support</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 14 }}>Send us your questions anytime.</p>
              <a href={`mailto:${CONTACT.email}`} className="pub-footer-link" style={{ marginBottom: 0 }}>{CONTACT.email}</a>
            </div>

            <div className="card card-body">
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(21,24,75,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Phone color="var(--brand-secondary)" size={22} />
              </div>
              <h3 style={{ marginBottom: 8 }}>Call or WhatsApp</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 14 }}>Fast replies for admissions and payments.</p>
              <a href={CONTACT.phoneTel} className="pub-footer-link" style={{ marginBottom: 6 }}>{CONTACT.phone}</a>
              <a href={WHATSAPP_HREF} className="pub-footer-link" style={{ marginBottom: 0 }}>WhatsApp</a>
            </div>

            <div className="card card-body">
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,157,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <MapPin color="var(--brand-secondary)" size={22} />
              </div>
              <h3 style={{ marginBottom: 8 }}>Office Address</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 14 }}>Visit us during working hours.</p>
              <span style={{ color: 'var(--text)', fontSize: 14 }}>Mogadishu, Somalia</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pub-section">
        <div className="pub-inner">
          <div className="contact-grid">
            <div className="card card-body contact-form-card">
              <div className="section-tag"><Send size={13}/> Send Message</div>
              <h2 className="section-h" style={{ marginBottom: 10 }}>We're Here to Help</h2>
              <p className="section-sub" style={{ marginBottom: 24 }}>
                Fill in your details and our team will get back to you shortly.
              </p>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" placeholder="Enter your full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-control" type="email" placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-control" placeholder="+252..." />
              </div>
              <div className="form-group">
                <label className="form-label">Your Message</label>
                <textarea className="form-control" rows={5} placeholder="Tell us how we can help..." />
              </div>
              <button className="btn btn-secondary btn-lg" type="button" style={{ width: '100%' }}>
                Send Message <ArrowRight size={16} />
              </button>
            </div>

            <div className="contact-side-col">
              <div className="card card-body">
                <div className="section-tag" style={{ marginBottom: 12 }}>⏰ Hours</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Clock size={16} color="var(--brand-secondary)" />
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>Sat - Thu: 8:00 AM - 6:00 PM</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} color="var(--brand-secondary)" />
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Average response time: under 2 hours</span>
                </div>
              </div>

              <div className="card card-body">
                <div className="section-tag" style={{ marginBottom: 12 }}><CheckCircle size={13}/> We Can Help With</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'Choosing the right course for your goals',
                    'Payment methods (EVC Plus, eDahab, Zaad)',
                    'Enrollment and account setup',
                    'Certificates and course access'
                  ].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <CheckCircle size={14} color="var(--brand-secondary)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicCta />

      <Footer />
    </div>
  )
}
