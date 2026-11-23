import { WHATSAPP_HREF } from '../../utils/whatsapp'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useSEO } from '../../hooks/useSEO'
import { Eye, EyeOff, ArrowRight, Sun, Moon, BookOpen, Award, Users, CheckCircle, Smartphone, Mail, GraduationCap, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import WhatsAppFloat from '../../components/common/WhatsAppFloat.jsx'
import BrandLogo from '../../components/common/BrandLogo.jsx'

export default function Register() {
  useSEO({ title: 'Create a Free Account', description: 'Create a free Tusmaal account to browse courses and get notified about new launches and special offers.', path: '/register' })
  const { register } = useAuth()
  const { toggle, isDark } = useTheme()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref') || ''

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    referral_code: refCode
  })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        referral_code: form.referral_code || undefined
      })
      toast.success('You\'re in! Check your email.')
      setSuccess({ name: form.full_name, email: form.email, message: res.message })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="login-shell">
        <div className="login-right" style={{ width: '100%' }}>
          <div style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,157,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--brand-secondary)' }}>
              <CheckCircle size={38} />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 12 }}>
              Welcome, {success.name.split(' ')[0]}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              {success.message || "You're now subscribed to our updates. You'll get new courses and special offers by email."}
            </p>
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} /> Want to start a course?
              </div>
              {[[Smartphone, 'Contact us on WhatsApp'], [Mail, `Tell us your email: ${success.email}`], [GraduationCap, "We'll unlock the course & your dashboard"]].map(([Icon, t]) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                  <Icon size={16} color="var(--brand-secondary)" strokeWidth={1.75}/>{t}
                </div>
              ))}
              <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                <MessageCircle size={16}/> Contact us on WhatsApp
              </a>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/courses" className="btn btn-outline-teal" style={{ flex: 1, justifyContent: 'center' }}>Browse Courses</Link>
              <Link to="/login" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-shell">
      <div className="login-left">
        <div className="login-left-grid"/><div className="login-left-orb"/>
        <div style={{position:'relative',zIndex:1}}>
          <Link to="/" style={{display:'block',marginBottom:52}}>
            <BrandLogo variant="onDark" size="auth" />
          </Link>
          <h1 style={{color:'#fff',fontSize:'clamp(2rem,3.5vw,3rem)',fontWeight:800,letterSpacing:'-0.03em',lineHeight:1.1,marginBottom:18}}>Join Free.<br/>Learn When You're Ready.</h1>
          <p style={{color:'rgba(255,255,255,0.55)',fontSize:15,lineHeight:1.8,marginBottom:48,maxWidth:380}}>Create a free account to browse courses and get notified about new launches. Course access is unlocked after you enroll with our team.</p>
          <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:48}}>
            {[[<Users size={17}/>, 'Free account — no payment to sign up'],[<BookOpen size={17}/>, 'Browse all courses anytime'],[<Award size={17}/>, 'Get emails when new courses launch']].map(([icon,text]) => (
              <div key={text} style={{display:'flex',alignItems:'center',gap:12,color:'rgba(255,255,255,0.7)',fontSize:14}}>
                <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,157,0,0.15)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--brand-secondary)',flexShrink:0}}>{icon}</div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="login-right">
        <div style={{width:'100%',maxWidth:400}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:44}}>
            <Link to="/" style={{fontSize:13,color:'var(--text-muted)'}}>← Back to site</Link>
            <button className="theme-toggle" onClick={toggle}>{isDark ? <Sun size={16}/> : <Moon size={16}/>}</button>
          </div>
          <div style={{marginBottom:32}}>
            <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-0.025em',marginBottom:8}}>Create account</h2>
            <p style={{color:'var(--text-muted)',fontSize:14}}>Already have an account? <Link to="/login" style={{color:'var(--brand-secondary)',fontWeight:700}}>Sign in →</Link></p>
          </div>
          {error && <div className="alert alert-error" style={{marginBottom:20}}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-control" type="text" placeholder="Your full name" required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-control" type="email" placeholder="your@email.com" autoComplete="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input className="form-control" type="tel" placeholder="+252 61 000 0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{position:'relative'}}>
                <input className="form-control" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" autoComplete="new-password" required minLength={8} value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{paddingRight:44}}/>
                <button type="button" onClick={() => setShowPass(s=>!s)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',display:'flex',padding:4}}>{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              </div>
            </div>
            {refCode && (
              <div className="form-group">
                <label className="form-label">Referral code</label>
                <input className="form-control" type="text" value={form.referral_code} readOnly style={{ opacity: 0.8 }}/>
              </div>
            )}
            <button type="submit" className="btn btn-secondary btn-lg" style={{width:'100%',justifyContent:'center',marginTop:8}} disabled={loading}>
              {loading ? <div style={{width:20,height:20,border:'2.5px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/> : <>Create Free Account <ArrowRight size={16}/></>}
            </button>
          </form>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.6 }}>
            By signing up you agree to receive course updates and announcements. Course access requires enrollment — <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-secondary)' }}>contact us on WhatsApp</a> when ready.
          </p>
        </div>
      </div>
      <WhatsAppFloat message="Hi Tusmaal, I need support." />
    </div>
  )
}
