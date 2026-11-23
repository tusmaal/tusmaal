import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon, Menu, X, ChevronRight, Mail, Phone } from 'lucide-react'
import WhatsAppFloat from '../common/WhatsAppFloat.jsx'
import BrandLogo from '../common/BrandLogo.jsx'
import { BRAND, CONTACT } from '../../config/brandAssets'
import { WHATSAPP_HREF } from '../../utils/whatsapp'

export function Navbar() {
  const { user } = useAuth()
  const { toggle, isDark } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const links = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About us' },
    { to: '/courses', label: 'Courses' },
    { to: '/alumni', label: 'Alumni' },
    { to: '/verify', label: 'Verify Certificate' },
    { to: '/faq', label: 'FAQ' },
    { to: '/contact', label: 'Contacts' },
  ]
  const isHome = location.pathname === '/'
  const dashPath = user ? `/${user.role}` : '/login'
  const overDark = !scrolled && (
    isHome ||
    location.pathname === '/about' ||
    location.pathname === '/courses' ||
    /^\/courses\/[^/]+$/.test(location.pathname)
  )
  const lightNav = !isDark && !scrolled && !overDark

  return (
    <>
      <nav
        className={`pub-nav${scrolled ? ' scrolled' : ''}${overDark ? ' over-dark' : ''}${isHome ? ' pub-nav--home' : ''}`}
        style={{
          background: isHome && !scrolled
            ? 'var(--brand-primary)'
            : scrolled
              ? undefined
              : 'transparent',
        }}
      >
        <div className="pub-nav-inner">
          <Link to="/" className="pub-logo">
            <BrandLogo variant={lightNav ? 'onLight' : 'onDark'} size="nav" />
          </Link>

          <div className="pub-nav-links" style={{ display: 'flex' }}>
            {links.map(l => (
              <Link key={l.to} to={l.to}
                className={`pub-nav-link${location.pathname === l.to ? ' active' : ''}`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="pub-nav-actions-desktop">
            <button className="theme-toggle" onClick={toggle} title="Toggle theme" type="button">
              {isDark ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            {user ? (
              <Link to={dashPath} className="btn btn-secondary btn-sm">
                Dashboard <ChevronRight size={14}/>
              </Link>
            ) : (
              <>
                <Link to="/login" className="pub-nav-link pub-nav-link-desktop">Sign In</Link>
                <Link to="/register" className="btn btn-secondary btn-sm">Get Started</Link>
              </>
            )}
            <button type="button" className="theme-toggle mob-nav-btn" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="pub-mobile-drawer">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`pub-nav-link${location.pathname === l.to ? ' active' : ''}`}>{l.label}</Link>
          ))}
          <div className="pub-mobile-drawer-divider" />
          {!user && (
            <Link to="/login" className="pub-nav-link">Sign In</Link>
          )}
          <Link to={user ? `/${user.role}` : '/register'} className="btn btn-secondary" style={{ justifyContent: 'center', minHeight: 44 }}>
            {user ? 'Dashboard' : 'Get Started'}
          </Link>
        </div>
      )}
      <WhatsAppFloat message="Hi Tusmaal, I need support." />
    </>
  )
}

export function Footer() {
  return (
    <>
    <footer className="pub-footer pub-footer--brand">
      <div className="pub-footer-inner">
        <div className="pub-footer-grid">
          <div>
            <div className="pub-footer-brand-logo">
              <BrandLogo variant="onDark" size="footer" />
            </div>
            <p className="pub-footer-slogan">{BRAND.slogan}</p>
            <p className="pub-footer-brand-desc">{BRAND.footerDesc}</p>
          </div>

          <div>
            <div className="pub-footer-col-title">Platform</div>
            {[['/', 'Home'], ['/about', 'About us'], ['/courses', 'Browse Courses'], ['/alumni', 'Alumni'], ['/verify', 'Verify Certificate'], ['/faq', 'FAQ'], ['/contact', 'Contacts'], ['/login', 'Student Login']].map(([to, label]) => (
              <Link key={to} to={to} className="pub-footer-link">{label}</Link>
            ))}
          </div>

          <div>
            <div className="pub-footer-col-title">Courses</div>
            {['Information Technology', 'Business & Management', 'Arabic Language', 'English Language', 'Mathematics'].map(s => (
              <Link key={s} to={`/courses?category=${s}`} className="pub-footer-link">{s}</Link>
            ))}
          </div>

          <div>
            <div className="pub-footer-col-title">Contact</div>
            <a href={`mailto:${CONTACT.email}`} className="pub-footer-link pub-footer-contact">
              <Mail size={13} /> {CONTACT.email}
            </a>
            <a href={CONTACT.phoneTel} className="pub-footer-link pub-footer-contact">
              <Phone size={13} /> {CONTACT.phone}
            </a>
            <a href={WHATSAPP_HREF} className="btn btn-secondary btn-sm pub-footer-wa">
              WhatsApp Us
            </a>
          </div>
        </div>

        <div className="pub-footer-bottom">
          <span className="pub-footer-copy">© {new Date().getFullYear()} Tusmaal. All rights reserved. · {BRAND.positioning}</span>
          <div className="pub-footer-legal">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  </>
  )
}
