import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { BRAND } from '../../config/brandAssets'

export default function PublicCta({ showPerks = false, altSection = false, fullBleed = false }) {
  if (fullBleed) {
    return (
      <section className="home-cta-band">
        <div className="home-cta-inner">
          <div className="section-tag section-tag--on-dark" style={{ display: 'inline-flex', margin: '0 auto 20px' }}>Start Learning</div>
          <h2 className="cta-h">{BRAND.ctaTitle}</h2>
          <p className="cta-sub">{BRAND.ctaDesc}</p>
          <div className="cta-btns">
            <Link to="/courses" className="btn btn-secondary btn-lg">
              Browse Courses <ArrowRight size={16} />
            </Link>
            <Link to="/register" className="btn btn-ghost-white btn-lg">Get Started</Link>
          </div>
          {showPerks && (
            <div className="cta-perks">
              {['No hidden fees', 'Pay in local currency', 'Account ready in 24h'].map(f => (
                <div key={f} className="cta-perk">
                  <CheckCircle size={14} color="var(--brand-secondary)" />
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className={`pub-section${altSection ? '' : ' pub-section-alt'}`}>
      <div className="pub-inner">
        <div className="cta-wrap">
          <div className="section-tag" style={{ display: 'inline-flex', margin: '0 auto 20px' }}>Start Learning</div>
          <h2 className="cta-h">{BRAND.ctaTitle}</h2>
          <p className="cta-sub">{BRAND.ctaDesc}</p>
          <div className="cta-btns">
            <Link to="/courses" className="btn btn-secondary btn-lg">
              Browse Courses <ArrowRight size={16} />
            </Link>
            <Link to="/register" className="btn btn-ghost-white btn-lg">Get Started</Link>
          </div>
          {showPerks && (
            <div className="cta-perks">
              {['No hidden fees', 'Pay in local currency', 'Account ready in 24h'].map(f => (
                <div key={f} className="cta-perk">
                  <CheckCircle size={14} color="var(--brand-secondary)" />
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
