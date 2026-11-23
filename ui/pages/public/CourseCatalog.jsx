import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Navbar, Footer } from '../../components/layout/PublicLayout.jsx'
import { courseAPI, categoryAPI, funnelAPI } from '../../services/api'
import { useSEO } from '../../hooks/useSEO'
import { BookOpen, Users, Search, SlidersHorizontal, X, Library } from 'lucide-react'

function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course.slug}`} className="pub-card">
      <div className="pub-card-thumb">
        {course.thumbnail
          ? <img src={course.thumbnail} alt={course.title}/>
          : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--brand-secondary)',opacity:0.35 }}><Library size={36} strokeWidth={1.5}/></div>}
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
            <span><BookOpen size={12}/> {course.total_lessons||0}</span>
            <span><Users size={12}/> {course.total_students||0}</span>
            <span style={{ textTransform:'capitalize' }}>{course.language}</span>
          </div>
          <div className="pub-card-price">${course.price}</div>
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background:'var(--bg-card)',borderRadius:20,border:'1px solid var(--border)',overflow:'hidden' }}>
      <div style={{ aspectRatio:'16/9',background:'var(--bg-glass)',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,var(--bg-glass-hover),transparent)',animation:'shimmer 1.5s infinite' }}/>
      </div>
      <div style={{ padding:22 }}>
        {[40,80,60,30].map(w => <div key={w} style={{ height:10,background:'var(--bg-glass)',borderRadius:6,marginBottom:12,width:`${w}%` }}/>)}
      </div>
    </div>
  )
}

export default function CourseCatalog() {
  useSEO({
    title: 'All Courses',
    description: 'Browse all Tusmaal courses — IT, business, languages, health and more, taught in Somali. Pay once, get 6 months access, earn certificates.',
    path: '/courses',
  })
  const [searchParams, setSearchParams] = useSearchParams()
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState(searchParams.get('search')||'')
  const [inputVal, setInputVal] = useState(searchParams.get('search')||'')
  const category = searchParams.get('category')||''
  const level = searchParams.get('level')||''

  useEffect(() => { funnelAPI.track({ type: 'catalog_view' }) }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      courseAPI.list({ search, category, level, page, limit: 12 }),
      categoryAPI.list()
    ]).then(([cr, catR]) => {
      setCourses(cr.data.data||[])
      setTotal(cr.data.pagination?.total||0)
      setCategories(catR.data.data||[])
    }).finally(() => setLoading(false))
  }, [search, category, level, page])

  const setFilter = (key, value) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value); else p.delete(key)
    setSearchParams(p); setPage(1)
  }

  const clearAll = () => { setSearchParams({}); setSearch(''); setInputVal(''); setPage(1) }
  const hasFilters = search || category || level
  const totalPages = Math.ceil(total / 12)

  return (
    <div>
      <Navbar/>

      {/* Hero header */}
      <div style={{ background:'var(--brand-primary)',paddingTop:110,paddingBottom:0,paddingLeft:'5%',paddingRight:'5%',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,157,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,157,0,0.05) 1px,transparent 1px)',backgroundSize:'56px 56px',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',top:'-30%',right:'-10%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,157,0,0.12) 0%,transparent 70%)',pointerEvents:'none' }}/>
        <div style={{ maxWidth:1280,margin:'0 auto',textAlign:'center',position:'relative',zIndex:1,paddingBottom:52 }}>
          <div className="section-tag" style={{ display:'inline-flex',margin:'0 auto 20px' }}><Library size={13}/> All Courses</div>
          <h1 style={{ color:'#fff',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:800,letterSpacing:'-0.025em',marginBottom:14,lineHeight:1.1 }}>
            Explore Our Course Library
          </h1>
          <p style={{ color:'rgba(255,255,255,0.6)',fontSize:16,marginBottom:40,maxWidth:480,margin:'0 auto 40px' }}>
            {total} expert courses taught in Somali language
          </p>
          {/* Search */}
          <div style={{ maxWidth:580,margin:'0 auto',position:'relative' }}>
            <Search size={18} style={{ position:'absolute',left:18,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.4)',zIndex:1 }}/>
            <input
              style={{ width:'100%',padding:'16px 52px 16px 50px',background:'rgba(255,255,255,0.08)',border:'1.5px solid rgba(255,255,255,0.15)',borderRadius:14,color:'#fff',fontSize:15,outline:'none',transition:'all 0.2s',fontFamily:'var(--font-body)' }}
              placeholder="Search courses, topics, instructors..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') { setSearch(inputVal); setPage(1) } }}
              onFocus={e => { e.target.style.borderColor='rgba(255,157,0,0.5)'; e.target.style.background='rgba(255,255,255,0.12)' }}
              onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.15)'; e.target.style.background='rgba(255,255,255,0.08)' }}
            />
            {inputVal && (
              <button onClick={() => { setInputVal(''); setSearch(''); setPage(1) }}
                style={{ position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',display:'flex' }}>
                <X size={16}/>
              </button>
            )}
          </div>
        </div>
        <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display:'block',width:'100%' }}>
          <path d="M0 20C360 44 1080 0 1440 20L1440 40L0 40Z" fill="var(--bg)"/>
        </svg>
      </div>

      {/* Main */}
      <div style={{ maxWidth:1280,margin:'0 auto',padding:'36px 5% 96px' }} className="catalog-layout">

        <div className="catalog-sidebar-col">
          <button type="button" className="btn btn-outline-teal catalog-filter-toggle" onClick={() => setFiltersOpen(o => !o)}>
            <SlidersHorizontal size={16}/> {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </button>

          {/* Sidebar filters */}
          <div className={`catalog-filters catalog-filters-panel${filtersOpen ? ' open' : ''}`} style={{ position:'sticky',top:90 }}>
          <div style={{ background:'var(--bg-card)',borderRadius:20,border:'1px solid var(--border)',padding:22 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <div style={{ fontWeight:700,fontSize:13,color:'var(--text)',display:'flex',alignItems:'center',gap:6 }}>
                <SlidersHorizontal size={14}/> Filters
              </div>
              {hasFilters && <button onClick={clearAll} style={{ fontSize:12,color:'var(--brand-secondary)',background:'none',border:'none',cursor:'pointer',fontWeight:700 }}>Clear all</button>}
            </div>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:10 }}>Category</div>
              {[{ name:'', course_count:null }, ...categories].map((c,i) => (
                <button key={c.name||'all'} onClick={() => { setFilter('category', c.name); setFiltersOpen(false) }}
                  style={{ width:'100%',textAlign:'left',padding:'8px 10px',borderRadius:9,border:'none',background:category===c.name?'rgba(255,157,0,0.12)':'transparent',color:category===c.name?'var(--brand-secondary)':'var(--text-muted)',fontWeight:category===c.name?700:400,fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2,transition:'all 0.2s' }}>
                  <span>{c.name||'All Categories'}</span>
                  {c.course_count!=null && <span style={{ fontSize:11,color:'var(--text-light)',fontWeight:500 }}>{c.course_count}</span>}
                </button>
              ))}
            </div>

            <div>
              <div style={{ fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:10 }}>Level</div>
              {['','beginner','intermediate','advanced'].map(l => (
                <button key={l||'all'} onClick={() => { setFilter('level', l); setFiltersOpen(false) }}
                  style={{ width:'100%',textAlign:'left',padding:'8px 10px',borderRadius:9,border:'none',background:level===l?'rgba(255,157,0,0.12)':'transparent',color:level===l?'var(--brand-secondary)':'var(--text-muted)',fontWeight:level===l?700:400,fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',textTransform:'capitalize',marginBottom:2,transition:'all 0.2s' }}>
                  {l||'All Levels'}
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* Results */}
        <div className="catalog-results">
          {/* Active filter chips */}
          {hasFilters && (
            <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:20 }}>
              {search && <span style={{ display:'flex',alignItems:'center',gap:6,background:'rgba(255,157,0,0.1)',color:'var(--brand-secondary)',border:'1px solid rgba(255,157,0,0.2)',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:700 }}>"{search}" <X size={11} style={{ cursor:'pointer' }} onClick={() => { setSearch(''); setInputVal('') }}/></span>}
              {category && <span style={{ display:'flex',alignItems:'center',gap:6,background:'rgba(255,157,0,0.1)',color:'var(--brand-secondary)',border:'1px solid rgba(255,157,0,0.2)',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:700 }}>{category} <X size={11} style={{ cursor:'pointer' }} onClick={() => setFilter('category','')}/></span>}
              {level && <span style={{ display:'flex',alignItems:'center',gap:6,background:'rgba(255,157,0,0.1)',color:'var(--brand-secondary)',border:'1px solid rgba(255,157,0,0.2)',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:700,textTransform:'capitalize' }}>{level} <X size={11} style={{ cursor:'pointer' }} onClick={() => setFilter('level','')}/></span>}
            </div>
          )}

          <div style={{ fontSize:13,color:'var(--text-muted)',fontWeight:500,marginBottom:20 }}>
            {loading ? 'Loading...' : `${total} course${total!==1?'s':''} found`}
          </div>

          {loading ? (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:24 }}>
              {[...Array(6)].map((_,i) => <SkeletonCard key={i}/>)}
            </div>
          ) : courses.length === 0 ? (
            <div style={{ textAlign:'center',padding:'80px 20px' }}>
              <div style={{ width:64,height:64,borderRadius:18,margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,157,0,0.12)',color:'var(--brand-secondary)' }}><Search size={28} strokeWidth={1.75}/></div>
              <h3 style={{ fontSize:22,marginBottom:10 }}>No courses found</h3>
              <p style={{ color:'var(--text-muted)',marginBottom:24 }}>Try adjusting your filters or search terms.</p>
              <button className="btn btn-secondary" onClick={clearAll}>Clear all filters</button>
            </div>
          ) : (
            <>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:24 }}>
                {courses.map(c => <CourseCard key={c.id} course={c}/>)}
              </div>
              {totalPages > 1 && (
                <div style={{ display:'flex',justifyContent:'center',gap:8,marginTop:52 }}>
                  {[...Array(totalPages)].map((_,i) => (
                    <button key={i} onClick={() => setPage(i+1)}
                      style={{ width:40,height:40,borderRadius:11,border:`1.5px solid ${page===i+1?'transparent':'var(--border)'}`,background:page===i+1?'var(--brand-secondary)':'transparent',color:page===i+1?'#15184b':'var(--text-muted)',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',transition:'all 0.2s' }}>
                      {i+1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer/>
    </div>
  )
}
