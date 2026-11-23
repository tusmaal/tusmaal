import { WHATSAPP_HREF } from '../../utils/whatsapp'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar, Footer } from '../../components/layout/PublicLayout.jsx'
import { BRAND } from '../../config/brandAssets'
import { landingAPI, siteFaqAPI } from '../../services/api'
import { useSEO } from '../../hooks/useSEO'
import PublicCta from '../../components/common/PublicCta.jsx'
import FaqAccordion from '../../components/common/FaqAccordion.jsx'
import { BookOpen, Users, Award, ArrowRight, CheckCircle, Star, Globe, ChevronRight, Zap, Shield, Play, GraduationCap, HelpCircle, Laptop, Briefcase, Search, Smartphone, KeyRound, Lightbulb, MessageCircle, Calendar, Quote, Monitor } from 'lucide-react'
import { CategoryIcon } from '../../config/categoryIcons'

const HOME_FAQ_LIMIT = 5

const HERO_COURSE_ICONS = [Laptop, Briefcase, BookOpen]

const HERO_FEATURES = [
  { icon: GraduationCap, label: 'Expert Instructors' },
  { icon: BookOpen, label: 'Online Courses' },
  { icon: Play, label: 'Practical Learning' },
  { icon: Award, label: 'Certificates' },
]

function PubCourseCard({ course }) {
  return (
    <Link to={`/courses/${course.slug}`} className="pub-card">
      <div className="pub-card-thumb">
        {course.thumbnail
          ? <img src={course.thumbnail} alt={course.title}/>
          : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--brand-secondary)',opacity:0.35 }}><BookOpen size={40} strokeWidth={1.5}/></div>}
        <div className="pub-card-level">{course.level}</div>
        <div className="pub-card-overlay"/>
      </div>
      <div className="pub-card-body">
        {course.category && <div className="pub-card-cat">{course.category}</div>}
        <div className="pub-card-title">{course.title}</div>
        <div className="pub-card-teacher">
          <div className="pub-card-teacher-dot">{course.teacher_name?.charAt(0)}</div>
          {course.teacher_name}
        </div>
        <div className="pub-card-footer">
          <div className="pub-card-meta">
            <span><BookOpen size={12}/> {course.total_lessons||0} lessons</span>
            <span><Users size={12}/> {course.total_students||0}</span>
          </div>
          <div className="pub-card-price">${course.price}</div>
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  useSEO({
    description: `${BRAND.positioning}. ${BRAND.promise}`,
    path: '/',
  })
  const [data, setData] = useState(null)
  const [faqs, setFaqs] = useState([])
  useEffect(() => { landingAPI.get().then(r => setData(r.data.data)).catch(() => {}) }, [])
  useEffect(() => {
    siteFaqAPI.publicList()
      .then(r => setFaqs((r.data.data || []).slice(0, HOME_FAQ_LIMIT)))
      .catch(() => setFaqs([]))
  }, [])

  const featured = data?.featured_courses || []
  const categories = data?.categories || []
  const teachers = data?.featured_teachers || []

  const mockCourses = [
    { id:1, title:'Complete Web Development Bootcamp', slug:'web-dev', category:'IT', teacher_name:'Ahmed Hassan', total_students:312, total_lessons:48, price:75, level:'beginner' },
    { id:2, title:'Business Management & Leadership', slug:'business', category:'Business', teacher_name:'Fadumo Ali', total_students:198, total_lessons:32, price:60, level:'intermediate' },
    { id:3, title:'English for Professionals', slug:'english', category:'Language', teacher_name:'Hodan Omar', total_students:245, total_lessons:40, price:50, level:'beginner' },
  ]

  return (
    <div className="home-page">
      <Navbar/>

      {/* ── HERO ───────────────────────────────────── */}
      <section className="hero hero--brand">
        <div className="hero-noise"/>
        <div className="hero-grid"/>
        <div className="hero-orb-1"/>
        <div className="hero-orb-2"/>

        <div className="hero-inner">
          <div>
            <p className="hero-positioning">{BRAND.positioning}</p>
            <h1 className="hero-h1">
              Learn{' '}
              <span className="hero-h1-teal">{BRAND.heroHeadingAccent}</span>
            </h1>
            <p className="hero-desc">{BRAND.promise}</p>
            <div className="hero-btns">
              <Link to="/courses" className="btn btn-secondary btn-lg">
                Explore Courses <ArrowRight size={18}/>
              </Link>
              <Link to="/about" className="btn btn-ghost-white btn-lg">
                How It Works
              </Link>
            </div>
            <div className="hero-features">
              {HERO_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="hero-feature">
                  <div className="hero-feature-icon">
                    <Icon size={18} />
                  </div>
                  <div className="hero-feature-label">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-header">
                <span>Popular Courses</span>
                <span style={{ color:'var(--brand-secondary)',fontSize:11,fontWeight:700 }}>Live</span>
              </div>
              {(featured.length ? featured : mockCourses).slice(0,3).map((c,i) => (
                <div key={c.id||i} className="hero-course-row">
                  <div className="hero-course-emoji" style={{ background:['rgba(255,157,0,0.12)','rgba(21,24,75,0.2)','rgba(255,157,0,0.08)'][i] }}>
                    {(() => { const Icon = HERO_COURSE_ICONS[i] || BookOpen; return <Icon size={18} strokeWidth={1.75}/> })()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="hero-course-name">{c.title?.slice(0,30)}{c.title?.length>30?'…':''}</div>
                    <div className="hero-course-meta">{c.teacher_name} · {c.total_students} students</div>
                    <div className="hero-mini-bar">
                      <div className="hero-mini-fill" style={{ width:`${[78,62,89][i]}%` }}/>
                    </div>
                  </div>
                </div>
              ))}
              <div className="hero-pill-row">
                {[['4.9★','Rating'],['100%','Somali'],['6mo','Access']].map(([v,l]) => (
                  <div key={l} className="hero-pill">
                    <div className="hero-pill-val">{v}</div>
                    <div className="hero-pill-lbl">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badges */}
            <div className="hero-float-1">
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:32,height:32,borderRadius:9,background:'rgba(255,157,0,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Award size={16} color="var(--brand-secondary)"/>
                </div>
                <div>
                  <div className="float-label">Certificate Earned</div>
                  <div className="float-sub">Web Dev · Just now</div>
                </div>
              </div>
            </div>
            <div className="hero-float-2">
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:32,height:32,borderRadius:9,background:'rgba(21,24,75,0.3)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Users size={16} color="#ffc14d"/>
                </div>
                <div>
                  <div className="float-label">12 New Students</div>
                  <div className="float-sub">Enrolled today</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transition to white content */}
        <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-wave" aria-hidden="true">
          <path d="M0 28C240 56 480 0 720 28C960 56 1200 0 1440 28L1440 56L0 56Z" fill="#ffffff"/>
        </svg>
      </section>

      <div className="home-body">
      {/* ── TRUST BAR ──────────────────────────────── */}
      <div className="home-trust-bar">
          {[[<Shield size={16}/>, 'Trusted by 1,200+ students'],[<Globe size={16}/>, 'Courses in Somali language'],[<Zap size={16}/>, '6 months access after payment'],[<Award size={16}/>, 'Recognised certificates']].map(([icon, text]) => (
            <div key={text} className="home-trust-item">
              <span className="home-trust-icon">{icon}</span>{text}
            </div>
          ))}
      </div>

      {/* ── CATEGORIES ─────────────────────────────── */}
      <section className="pub-section">
        <div className="pub-inner">
          <div className="section-row">
            <div>
              <div className="section-tag"><BookOpen size={13}/> Our Courses</div>
              <h2 className="section-h">Find Your Path</h2>
              <p className="section-sub">From IT to Islamic studies — we cover what Somalia needs most.</p>
            </div>
            <Link to="/courses" className="btn btn-outline-teal" style={{ whiteSpace:'nowrap' }}>
              All Courses <ChevronRight size={14}/>
            </Link>
          </div>
          <div className="cat-grid">
            {(categories.length ? categories : [
              { name:'Information Technology', icon:'laptop', course_count:12 },
              { name:'Business & Management', icon:'briefcase', course_count:8 },
              { name:'Arabic Language', icon:'book', course_count:6 },
              { name:'English Language', icon:'globe', course_count:9 },
              { name:'Mathematics', icon:'calculator', course_count:5 },
            ]).filter(cat => Number(cat.course_count) > 0).map(cat => (
              <Link to={`/courses?category=${cat.name}`} key={cat.name} className="cat-card">
                <span className="cat-emoji"><CategoryIcon name={cat.icon} size={26}/></span>
                <div className="cat-name">{cat.name}</div>
                <div className="cat-count">{cat.course_count} courses</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED COURSES ───────────────────────── */}
      <section className="pub-section">
        <div className="pub-inner">
          <div className="section-row">
            <div>
              <div className="section-tag"><Star size={13}/> Featured</div>
              <h2 className="section-h">Top Courses This Month</h2>
              <p className="section-sub">Handpicked for quality, relevance and student success.</p>
            </div>
            <Link to="/courses" className="btn btn-outline-teal" style={{ whiteSpace:'nowrap' }}>
              Browse All <ChevronRight size={14}/>
            </Link>
          </div>
          <div className="grid-3">
            {(featured.length ? featured : mockCourses).map(c => <PubCourseCard key={c.id} course={c}/>)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section className="pub-section home-section-divider">
        <div className="pub-inner">
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div className="section-tag" style={{ display:'inline-flex',margin:'0 auto 16px' }}><GraduationCap size={13}/> Process</div>
            <h2 className="section-h">Get Started in 4 Steps</h2>
            <p className="section-sub" style={{ margin:'0 auto' }}>Simple enrollment designed for Somalia — no complicated signups.</p>
          </div>
          <div className="steps-grid">
              {[
                { n:'01', icon:Search, title:'Browse Courses', desc:'Explore our catalog of expert-taught courses in IT, business, language and more.' },
                { n:'02', icon:Smartphone, title:'Contact & Pay', desc:'Reach us via WhatsApp or phone. Pay through EVC Plus, eDahab, Zaad, or bank transfer.' },
                { n:'03', icon:KeyRound, title:'Get Your Account', desc:'Within 24 hours we create your personal student account and grant course access.' },
                { n:'04', icon:GraduationCap, title:'Learn & Certify', desc:'Study at your own pace, complete quizzes and assignments, earn your certificate.' },
              ].map(s => (
              <div key={s.n} className="step-cell">
                <div className="step-num">{s.n}</div>
                  <div className="why-card-emoji"><s.icon size={20} strokeWidth={1.75}/></div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ──────────────────────────── */}
      <section className="pub-section">
        <div className="pub-inner">
          <div className="why-grid">
            <div>
              <div className="section-tag"><Lightbulb size={13}/> Why Us</div>
              <h2 className="section-h">Built for<br/>Somali Learners</h2>
              <p className="section-sub" style={{ marginTop:14 }}>Every detail — from language to payment methods — is designed for you.</p>
              <div className="why-checks">
                {['All courses taught in Somali language','Pay via EVC Plus, eDahab, Zaad or cash','Download materials for offline learning','Personal support from our admin team','Certificates recognised by employers','6 months access from enrollment date'].map(item => (
                  <div key={item} className="why-check">
                    <div className="why-check-icon"><CheckCircle size={12} color="var(--brand-secondary)"/></div>
                    <span className="why-check-text">{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/courses" className="btn btn-secondary btn-lg" style={{ marginTop:36 }}>
                Start Learning <ArrowRight size={16}/>
              </Link>
            </div>
            <div className="why-cards">
              {[[Monitor,'Online Learning','Study anywhere on any device, at your own pace.'],[Award,'Certificates','Earn recognised completion certificates.'],[MessageCircle,'Q&A Support','Ask instructors directly in every lesson.'],[Calendar,'6 Months Access','One-time payment — full access for six months.']].map(([Icon,t,d]) => (
                <div key={t} className="why-card">
                  <div className="why-card-emoji"><Icon size={20} strokeWidth={1.75}/></div>
                  <div className="why-card-title">{t}</div>
                  <div className="why-card-desc">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ PREVIEW ────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="pub-section home-section-divider">
          <div className="pub-inner home-faq">
            <div className="section-row">
              <div>
                <div className="section-tag">
                  <HelpCircle size={14} style={{ marginRight: 6 }} />
                  FAQ
                </div>
                <h2 className="section-h">Common Questions</h2>
                <p className="section-sub">Quick answers to help you get started with Tusmaal.</p>
              </div>
              <Link to="/faq" className="btn btn-outline-teal" style={{ whiteSpace: 'nowrap' }}>
                View All FAQs <ChevronRight size={14} />
              </Link>
            </div>
            <FaqAccordion faqs={faqs} />
            <p className="home-faq-more">
              Have more questions?{' '}
              <Link to="/faq">Browse the full FAQ page</Link>
              {' '}or{' '}
              <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer">message us on WhatsApp</a>.
            </p>
          </div>
        </section>
      )}

      {/* ── INSTRUCTORS ────────────────────────────── */}
      {teachers.length > 0 && (
        <section className="pub-section home-section-divider">
          <div className="pub-inner">
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <div className="section-tag" style={{ display:'inline-flex',margin:'0 auto 16px' }}><Users size={13}/> Instructors</div>
              <h2 className="section-h">Learn From The Best</h2>
              <p className="section-sub" style={{ margin:'0 auto' }}>Somalia's most experienced educators, teaching in your language.</p>
            </div>
            <div className="grid-4">
              {teachers.map(t => (
                <div key={t.id} className="teacher-card">
                  <div className="teacher-ava">{t.full_name?.charAt(0)}</div>
                  <div className="teacher-name">{t.full_name}</div>
                  <div className="teacher-meta">{t.course_count} courses · {t.total_students||0} students</div>
                  {t.bio && <div className="teacher-bio">{t.bio?.slice(0,90)}{t.bio?.length>90?'…':''}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ───────────────────────────── */}
      <section className="pub-section">
        <div className="pub-inner">
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div className="section-tag" style={{ display:'inline-flex',margin:'0 auto 16px' }}><Quote size={13}/> Testimonials</div>
            <h2 className="section-h">What Our Students Say</h2>
          </div>
          <div className="grid-3">
            {[
              { name:'Hodan Abdi', role:'IT Graduate', text:'Tusmaal changed my life. I learned web development in my own language and now work as a freelancer earning great income.', avatar:'H' },
              { name:'Mohamed Farah', role:'Business Student', text:'The business course was incredibly detailed. The instructor explained everything clearly in Somali, making complex concepts easy to understand.', avatar:'M' },
              { name:'Amina Hassan', role:'English Course', text:'My English improved dramatically. I got a promotion at work because of the professional communication skills I learned here.', avatar:'A' },
            ].map(t => (
              <div key={t.name} className="testi-card">
                <div className="testi-stars">{[...Array(5)].map((_,i) => <Star key={i} size={13} fill="var(--brand-secondary)" color="var(--brand-secondary)"/>)}</div>
                <p className="testi-text">"{t.text}"</p>
                <div className="testi-author">
                  <div className="testi-ava">{t.avatar}</div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>

      <PublicCta showPerks fullBleed />

      <Footer />
    </div>
  )
}
