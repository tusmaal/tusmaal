import { WHATSAPP_HREF } from '../../utils/whatsapp'
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Navbar, Footer } from '../../components/layout/PublicLayout.jsx'
import { courseAPI, funnelAPI } from '../../services/api'
import { useSEO } from '../../hooks/useSEO'
import { BookOpen, Clock, Users, Award, ChevronDown, ChevronUp, Play, FileText, Lock, CheckCircle, Star, ArrowRight, Globe, Library, Calendar, MessageCircle, SearchX } from 'lucide-react'

export default function CourseDetail() {
  const { slug } = useParams()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState({ 0: true })

  useEffect(() => {
    courseAPI.detail(slug).then(r => {
      setCourse(r.data.data)
      if (r.data.data?.id) funnelAPI.track({ type: 'course_view', course_id: r.data.data.id })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [slug])

  useSEO({
    title: course?.title,
    description: course?.description
      ? course.description.replace(/\s+/g, ' ').trim().slice(0, 160)
      : 'Enroll in this Tusmaal course — taught in Somali, with 6 months of access and a certificate on completion.',
    path: `/courses/${slug}`,
  })

  if (loading) return (
    <div><Navbar/>
      <div style={{ minHeight:'70vh',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <div className="spinner" style={{ width:40,height:40 }}/>
      </div>
    </div>
  )

  if (!course) return (
    <div><Navbar/>
      <div style={{ textAlign:'center',padding:'140px 20px' }}>
        <div style={{ width:72,height:72,borderRadius:20,margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,157,0,0.12)',color:'var(--brand-secondary)' }}><SearchX size={32} strokeWidth={1.75}/></div>
        <h2>Course Not Found</h2>
        <Link to="/courses" className="btn btn-secondary" style={{ marginTop:24 }}>Browse All Courses</Link>
      </div>
      <Footer/>
    </div>
  )

  const totalLessons = course.sections?.reduce((s,sec) => s+(sec.lessons?.length||0), 0)||0
  const toggle = i => setOpen(p => ({ ...p, [i]: !p[i] }))

  return (
    <div>
      <Navbar/>

      {/* Hero */}
      <div style={{ background:'var(--brand-primary)',paddingTop:90,paddingBottom:0,paddingLeft:'5%',paddingRight:'5%',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,157,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,157,0,0.05) 1px,transparent 1px)',backgroundSize:'52px 52px',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',top:'-40%',right:'-8%',width:520,height:520,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,157,0,0.12) 0%,transparent 70%)',pointerEvents:'none' }}/>

        <div style={{ maxWidth:1280,margin:'0 auto',position:'relative',zIndex:1,paddingBottom:0 }} className="detail-hero-grid">
          {/* Left */}
          <div style={{ paddingTop:40,paddingBottom:52 }}>
            <Link to="/courses" style={{ color:'rgba(255,255,255,0.45)',fontSize:13,display:'inline-flex',alignItems:'center',gap:5,marginBottom:24,transition:'color 0.2s' }}
              onMouseEnter={e=>e.target.style.color='rgba(255,255,255,0.8)'}
              onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.45)'}>
              ← Back to courses
            </Link>
            {course.category && (
              <div className="section-tag" style={{ marginBottom:20 }}>{course.category}</div>
            )}
            <h1 style={{ color:'#fff',fontSize:'clamp(1.7rem,3.5vw,2.8rem)',fontWeight:800,letterSpacing:'-0.025em',lineHeight:1.12,marginBottom:20 }}>
              {course.title}
            </h1>
            <p style={{ color:'rgba(255,255,255,0.6)',fontSize:15,lineHeight:1.8,marginBottom:28,maxWidth:560 }}>
              {course.description}
            </p>
            <div style={{ display:'flex',flexWrap:'wrap',gap:20,marginBottom:28 }}>
              {[
                [<BookOpen size={13}/>, `${totalLessons} lessons`],
                [<Clock size={13}/>, `${course.duration_hours}h total`],
                [<Users size={13}/>, `${course.total_students} students`],
                [<Globe size={13}/>, course.language],
                [<Award size={13}/>, 'Certificate'],
              ].map(([icon,text]) => (
                <div key={text} style={{ display:'flex',alignItems:'center',gap:7,color:'rgba(255,255,255,0.65)',fontSize:13 }}>
                  <span style={{ color:'var(--brand-secondary)' }}>{icon}</span>{text}
                </div>
              ))}
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,var(--brand-secondary),#ffc14d)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:' var(--brand-primary)',fontSize:17,fontFamily:'Syne,sans-serif' }}>
                {course.teacher_name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize:12,color:'rgba(255,255,255,0.4)' }}>Instructor</div>
                <div style={{ fontSize:15,fontWeight:700,color:'#fff' }}>{course.teacher_name}</div>
              </div>
            </div>
          </div>

          {/* Enroll card */}
          <div style={{ paddingTop:30,paddingBottom:0 }}>
            <div className="detail-sticky-card" style={{ background:'var(--bg-card)',borderRadius:24,padding:26,boxShadow:'0 24px 80px rgba(0,0,0,0.4)',border:'1px solid var(--border)' }}>
              {/* Thumb */}
              <div style={{ aspectRatio:'16/9',borderRadius:14,overflow:'hidden',background:'linear-gradient(135deg,var(--brand-primary),var(--brand-primary-mid))',marginBottom:20,position:'relative' }}>
                {course.thumbnail
                  ? <img src={course.thumbnail} alt={course.title} style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                  : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',opacity:0.45 }}><Library size={40} strokeWidth={1.5}/></div>}
                <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <div style={{ width:52,height:52,borderRadius:'50%',background:'rgba(255,255,255,0.15)',backdropFilter:'blur(10px)',border:'2px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <Play size={20} color="#fff" fill="#fff"/>
                  </div>
                </div>
              </div>

              <div style={{ display:'flex',alignItems:'baseline',gap:10,marginBottom:4 }}>
                <div style={{ fontSize:36,fontWeight:800,color:'var(--text)',fontFamily:'Syne,sans-serif' }}>${course.price}</div>
                <div style={{ fontSize:14,color:'var(--text-muted)',textDecoration:'line-through' }}>${Math.round(course.price*1.4)}</div>
                <div style={{ fontSize:12,fontWeight:700,color:'var(--brand-secondary)',background:'rgba(255,157,0,0.1)',border:'1px solid rgba(255,157,0,0.2)',borderRadius:6,padding:'3px 8px',marginLeft:4 }}>30% OFF</div>
              </div>
              <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:20 }}>One-time payment · 6 months access</div>

              <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer"
                className="btn btn-secondary btn-lg" style={{ width:'100%',justifyContent:'center',marginBottom:10 }}>
                <MessageCircle size={16}/> Enroll via WhatsApp
              </a>
              <Link to="/login" className="btn btn-glass btn-sm" style={{ width:'100%',justifyContent:'center',marginBottom:20 }}>
                Already have an account? <ArrowRight size={13}/>
              </Link>

              <div style={{ borderTop:'1px solid var(--border)',paddingTop:18 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:12 }}>This course includes</div>
                {[
                  [<BookOpen size={13}/>, `${totalLessons} video & text lessons`],
                  [<Clock size={13}/>, `${course.duration_hours} hours of content`],
                  [<Award size={13}/>, 'Certificate of completion'],
                  [<Globe size={13}/>, `Language: ${course.language}`],
                  [<Calendar size={13}/>,'6 months access — pay once'],
                ].map(([icon,text]) => (
                  <div key={text} style={{ display:'flex',alignItems:'center',gap:9,fontSize:13,color:'var(--text-muted)',marginBottom:9 }}>
                    <span style={{ color:'var(--brand-secondary)',display:'flex',alignItems:'center' }}>{icon}</span>{text}
                  </div>
                ))}
              </div>

              {/* Payment methods */}
              <div style={{ background:'var(--bg-glass)',borderRadius:12,padding:14,marginTop:16,border:'1px solid var(--border)' }}>
                <div style={{ fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10 }}>Accepted payments</div>
                <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
                  {['EVC Plus','eDahab','Zaad','Bank','Cash'].map(m => (
                    <span key={m} style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:7,padding:'4px 10px',fontSize:11,fontWeight:600,color:'var(--text-muted)' }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display:'block',width:'100%' }}>
          <path d="M0 20C360 44 1080 0 1440 20L1440 40L0 40Z" fill="var(--bg)"/>
        </svg>
      </div>

      {/* Body */}
      <div style={{ maxWidth:1280,margin:'0 auto',padding:'56px 5% 96px' }} className="detail-content-grid">
        <div>
          {/* What you'll learn */}
          <div style={{ background:'var(--bg-card)',borderRadius:20,border:'1px solid var(--border)',padding:32,marginBottom:28 }}>
            <h2 style={{ fontSize:22,marginBottom:22 }}>What You'll Learn</h2>
            <div className="detail-meta-grid">
              {['Expert-led instruction in Somali','Real-world practical projects','Quiz-based knowledge testing','Assignment feedback from instructor','Certificate upon completion','6 months access to all materials'].map(item => (
                <div key={item} style={{ display:'flex',gap:10,fontSize:13,alignItems:'flex-start' }}>
                  <CheckCircle size={15} color="var(--brand-secondary)" style={{ flexShrink:0,marginTop:2 }}/>
                  <span style={{ color:'var(--text-muted)',lineHeight:1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructor */}
          {course.teacher_name && (
            <div style={{ background:'var(--bg-card)',borderRadius:20,border:'1px solid var(--border)',padding:32,marginBottom:28 }}>
              <h2 style={{ fontSize:22,marginBottom:20 }}>Your Instructor</h2>
              <div style={{ display:'flex',gap:20,alignItems:'flex-start' }}>
                <div style={{ width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:800,color:'#fff',flexShrink:0,fontFamily:'Syne,sans-serif' }}>
                  {course.teacher_name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight:800,fontSize:18,marginBottom:6 }}>{course.teacher_name}</div>
                  <div style={{ display:'flex',gap:3,marginBottom:12 }}>
                    {[...Array(5)].map((_,i) => <Star key={i} size={13} fill="var(--brand-secondary)" color="var(--brand-secondary)"/>)}
                    <span style={{ fontSize:12,color:'var(--text-muted)',marginLeft:6 }}>Expert Instructor</span>
                  </div>
                  {course.teacher_bio && <p style={{ fontSize:14,color:'var(--text-muted)',lineHeight:1.75 }}>{course.teacher_bio}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Curriculum */}
          <div style={{ background:'var(--bg-card)',borderRadius:20,border:'1px solid var(--border)',overflow:'hidden' }}>
            <div style={{ padding:'24px 28px',borderBottom:'1px solid var(--border)' }}>
              <h2 style={{ fontSize:22,marginBottom:6 }}>Course Curriculum</h2>
              <div style={{ fontSize:13,color:'var(--text-muted)' }}>{course.sections?.length||0} sections · {totalLessons} lessons · {course.duration_hours}h</div>
            </div>
            {course.sections?.map((section, i) => (
              <div key={section.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <button onClick={() => toggle(i)}
                  style={{ width:'100%',padding:'16px 28px',background:open[i]?'var(--bg-glass)':'transparent',border:'none',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'var(--text)',transition:'background 0.2s' }}>
                  <span>{section.title}</span>
                  <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <span style={{ fontSize:12,color:'var(--text-muted)',fontWeight:500,fontFamily:'var(--font-body)' }}>{section.lessons?.length||0} lessons</span>
                    {open[i] ? <ChevronUp size={16} color="var(--text-muted)"/> : <ChevronDown size={16} color="var(--text-muted)"/>}
                  </div>
                </button>
                {open[i] && (
                  <div>
                    {section.lessons?.map(l => (
                      <div key={l.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'11px 28px',borderTop:'1px solid var(--border)' }}>
                        <div style={{ width:28,height:28,borderRadius:8,background:l.is_preview?'rgba(255,157,0,0.12)':'var(--bg-glass)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          {l.content_type==='video'||l.content_type==='youtube'
                            ? <Play size={11} color={l.is_preview?'var(--brand-secondary)':'var(--text-muted)'}/>
                            : <FileText size={11} color={l.is_preview?'var(--brand-secondary)':'var(--text-muted)'}/>}
                        </div>
                        <span style={{ flex:1,fontSize:13,color:'var(--text)' }}>{l.title}</span>
                        {l.is_preview
                          ? <span style={{ fontSize:11,fontWeight:700,color:'var(--brand-secondary)',background:'rgba(255,157,0,0.1)',padding:'3px 9px',borderRadius:6,border:'1px solid rgba(255,157,0,0.2)' }}>Preview</span>
                          : <Lock size={12} color="var(--text-light)"/>}
                        {l.duration_minutes>0 && <span style={{ fontSize:12,color:'var(--text-muted)',minWidth:36,textAlign:'right' }}>{l.duration_minutes}m</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sticky right panel */}
        <div>
          <div style={{ background:'var(--bg-card)',borderRadius:20,border:'1px solid var(--border)',padding:28,marginBottom:16 }}>
            <h3 style={{ fontSize:17,marginBottom:14 }}>Ready to Start?</h3>
            <p style={{ fontSize:13,color:'var(--text-muted)',lineHeight:1.75,marginBottom:20 }}>Contact us on WhatsApp after payment. Account created within 24 hours.</p>
            <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ width:'100%',justifyContent:'center',marginBottom:10 }}><MessageCircle size={16}/> WhatsApp to Enroll</a>
            <Link to="/login" className="btn btn-glass btn-sm" style={{ width:'100%',justifyContent:'center' }}>Already have an account?</Link>
          </div>

          <div style={{ background:'linear-gradient(135deg,var(--brand-primary),var(--brand-primary-mid))',borderRadius:20,padding:26 }}>
            <div style={{ fontSize:12,color:'rgba(255,255,255,0.45)',marginBottom:6 }}>One-time price</div>
            <div style={{ fontSize:38,fontWeight:800,color:'var(--brand-secondary)',marginBottom:4,fontFamily:'Syne,sans-serif' }}>${course.price}</div>
            <div style={{ fontSize:12,color:'rgba(255,255,255,0.45)',marginBottom:18 }}>Pay in Somali shillings accepted</div>
            {['6 months access','Full certificate included','24/7 content access','Instructor Q&A'].map(f => (
              <div key={f} style={{ display:'flex',alignItems:'center',gap:8,fontSize:13,color:'rgba(255,255,255,0.65)',marginBottom:10 }}>
                <CheckCircle size={14} color="var(--brand-secondary)"/>{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer/>
    </div>
  )
}
