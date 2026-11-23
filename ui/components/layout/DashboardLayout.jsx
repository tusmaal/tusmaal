import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { adminAPI } from '../../services/api'
import WhatsAppFloat from '../common/WhatsAppFloat.jsx'
import BrandLogo from '../common/BrandLogo.jsx'
import { LayoutDashboard, BookOpen, Users, Settings, LogOut, FileText, ClipboardList, Megaphone, Award, Home, Menu, X, CreditCard, BarChart2, ShieldCheck, BookMarked, Sun, Moon, Ticket, Package, TrendingUp, Share2, Video, MessageSquare, Gift, Send, HelpCircle, UsersRound, GraduationCap } from 'lucide-react'

const NAV = {
  admin: [
    { label:'Overview', items:[
      { to:'/admin', icon:<LayoutDashboard size={15}/>, label:'Dashboard' },
      { to:'/admin/users', icon:<Users size={15}/>, label:'Users' },
      { to:'/admin/courses', icon:<BookOpen size={15}/>, label:'All Courses' },
      { to:'/admin/course-reviews', icon:<FileText size={15}/>, label:'Draft Courses' },
      { to:'/admin/access', icon:<ShieldCheck size={15}/>, label:'Course Access' },
    ]},
    { label:'Finance', items:[
      { to:'/admin/payments', icon:<CreditCard size={15}/>, label:'Payments' },
      { to:'/admin/reports', icon:<BarChart2 size={15}/>, label:'Reports' },
    ]},
    { label:'Growth', items:[
      { to:'/admin/coupons', icon:<Ticket size={15}/>, label:'Coupons' },
      { to:'/admin/bundles', icon:<Package size={15}/>, label:'Bundles & Plans' },
      { to:'/admin/funnel', icon:<TrendingUp size={15}/>, label:'Funnel Analytics' },
      { to:'/admin/referrals', icon:<Share2 size={15}/>, label:'Referrals' },
      { to:'/admin/broadcast', icon:<Send size={15}/>, label:'Email Broadcast' },
    ]},
    { label:'Content', items:[
      { to:'/admin/categories', icon:<BookMarked size={15}/>, label:'Categories' },
      { to:'/admin/announcements', icon:<Megaphone size={15}/>, label:'Announcements' },
      { to:'/admin/faqs', icon:<HelpCircle size={15}/>, label:'FAQs' },
      { to:'/admin/team', icon:<UsersRound size={15}/>, label:'Team' },
      { to:'/admin/alumni', icon:<GraduationCap size={15}/>, label:'Alumni' },
      { to:'/admin/settings', icon:<Settings size={15}/>, label:'Settings' },
    ]},
  ],
  teacher: [
    { label:'Overview', items:[
      { to:'/teacher', icon:<LayoutDashboard size={15}/>, label:'Dashboard' },
      { to:'/teacher/courses', icon:<BookOpen size={15}/>, label:'My Courses' },
    ]},
    { label:'Teaching', items:[
      { to:'/teacher/assignments', icon:<ClipboardList size={15}/>, label:'Assignments' },
      { to:'/teacher/quizzes', icon:<FileText size={15}/>, label:'Quizzes' },
      { to:'/teacher/announcements', icon:<Megaphone size={15}/>, label:'Announcements' },
    ]},
    { label:'Engagement', items:[
      { to:'/teacher/live', icon:<Video size={15}/>, label:'Live Classes' },
      { to:'/teacher/qa', icon:<MessageSquare size={15}/>, label:'Student Q&A' },
    ]},
  ],
  student: [
    { label:'Learning', items:[
      { to:'/student', icon:<LayoutDashboard size={15}/>, label:'Dashboard' },
      { to:'/student/courses', icon:<BookOpen size={15}/>, label:'My Courses' },
      { to:'/student/live', icon:<Video size={15}/>, label:'Live Classes' },
      { to:'/student/certificates', icon:<Award size={15}/>, label:'Certificates' },
    ]},
    { label:'Rewards', items:[
      { to:'/student/rewards', icon:<Gift size={15}/>, label:'Refer & Earn' },
    ]},
    { label:'Updates', items:[
      { to:'/student/announcements', icon:<Megaphone size={15}/>, label:'Announcements' },
    ]},
    { label:'Account', items:[
      { to:'/student/settings', icon:<Settings size={15}/>, label:'Settings' },
    ]},
  ],
}

export default function DashboardLayout({ children, title }) {
  const { user, logout } = useAuth()
  const { toggle, isDark } = useTheme()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [pendingReviewCount, setPendingReviewCount] = useState(0)
  const nav = NAV[user?.role] || []

  useEffect(() => {
    if (user?.role !== 'admin') return
    adminAPI.getReviewCourses({ status: 'pending_review' })
      .then(r => setPendingReviewCount((r.data.data || []).length))
      .catch(() => setPendingReviewCount(0))
  }, [user?.role, location.pathname])

  const isActive = to =>
    to === '/admin' || to === '/teacher' || to === '/student'
      ? location.pathname === to
      : location.pathname.startsWith(to)

  return (
    <div className="app-layout">
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <BrandLogo size="sidebar" variant="onDark" />
          <span style={{color:'var(--brand-secondary)',fontSize:11,textTransform:'capitalize',letterSpacing:'.04em',display:'block',marginTop:8}}>{user?.role} Portal</span>
        </div>

        <nav className="sidebar-nav">
          {nav.map(section => (
            <div key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map(item => (
                <Link key={item.to} to={item.to} className={`nav-item${isActive(item.to) ? ' active' : ''}`} onClick={() => setOpen(false)}>
                  {item.icon}
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    {item.label}
                    {item.to === '/admin/course-reviews' && pendingReviewCount > 0 && (
                      <span style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: 999,
                        padding: '0 6px',
                        marginLeft: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--brand-secondary)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: 1
                      }}>
                        {pendingReviewCount}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link to="/" className="nav-item"><Home size={15}/><span>Public Site</span></Link>
          <button className="nav-item" style={{width:'100%',border:'none',background:'none',color:'rgba(239,68,68,0.8)',cursor:'pointer',textAlign:'left'}} onClick={logout}>
            <LogOut size={15}/><span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button type="button" className="mob-sidebar-btn" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(o=>!o)}>
              {open ? <X size={20}/> : <Menu size={20}/>}
            </button>
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-right">
            <button className="theme-toggle" onClick={toggle} title="Toggle theme" type="button">
              {isDark ? <Sun size={15}/> : <Moon size={15}/>}
            </button>
            <div style={{display:'flex',alignItems:'center',gap:9,padding:'6px 12px',background:'var(--bg-glass)',border:'1px solid var(--border)',borderRadius:10}}>
              <div className="avatar" style={{width:30,height:30,fontSize:12}}>{user?.full_name?.charAt(0)}</div>
              <div className="topbar-user-details">
                <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{user?.full_name}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize'}}>{user?.role}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
      {user?.role === 'student' && (
        <WhatsAppFloat
          message="Hi Tusmaal, I need help with my course."
          label="Get course support on WhatsApp"
        />
      )}
    </div>
  )
}
