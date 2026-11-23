import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Spinner, EmptyState, ProgressBar } from '../../components/common/index.jsx'
import { funnelAPI, courseAPI } from '../../services/api'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function Funnel() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [dropoff, setDropoff] = useState(null)
  const [dropLoading, setDropLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    funnelAPI.overview(days).then(r => setData(r.data.data)).finally(() => setLoading(false))
  }, [days])

  useEffect(() => {
    courseAPI.list().then(r => { const cs = r.data.data || []; setCourses(cs); if (cs[0]) setCourseId(cs[0].id) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!courseId) return
    setDropLoading(true)
    funnelAPI.dropoff(courseId).then(r => setDropoff(r.data.data)).finally(() => setDropLoading(false))
  }, [courseId])

  const maxStage = data ? Math.max(...data.stages.map(s => s.value), 1) : 1

  return (
    <DashboardLayout title="Funnel Analytics">
      <div className="page-header">
        <h1>Funnel Analytics</h1>
        <select className="form-control" style={{ maxWidth: 160 }} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Catalog → Enrollment → Completion</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>How visitors move from browsing to finishing a course.</p>
            {data?.stages.map((s, i) => (
              <div key={s.key} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{s.label}</span>
                  <span>
                    <strong>{s.value.toLocaleString()}</strong>
                    {i > 0 && s.rate_from_prev != null && (
                      <span style={{ marginLeft: 10, fontSize: 12, color: s.rate_from_prev >= 50 ? 'var(--success)' : 'var(--warning)' }}>
                        {s.rate_from_prev}% conversion
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ height: 30, background: 'var(--bg-2)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.max(3, (s.value / maxStage) * 100)}%`, height: '100%',
                    background: `linear-gradient(90deg, var(--brand-primary-light), var(--brand-secondary))`,
                    borderRadius: 8, transition: 'width .4s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="page-header" style={{ marginTop: 8 }}>
        <h2 style={{ fontSize: 18 }}>Per-Lesson Drop-off</h2>
        <select className="form-control" style={{ maxWidth: 280 }} value={courseId} onChange={e => setCourseId(e.target.value)}>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {dropLoading ? <Spinner /> : !dropoff?.lessons?.length ? (
        <EmptyState icon={<TrendingDown size={48}/>} title="No lesson data yet" description="Drop-off appears once students start completing lessons." />
      ) : (
        <div className="card"><div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {dropoff.total_students} enrolled student(s). The biggest red bars are where students quit — fix those lessons first.
          </p>
          {dropoff.lessons.map((l, i) => (
            <div key={l.lesson_id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span><span style={{ color: 'var(--text-muted)' }}>{i + 1}.</span> {l.lesson} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>· {l.section}</span></span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{l.completed} completed</span>
                  {l.drop_from_previous > 0 && (
                    <span style={{ color: l.drop_from_previous >= 40 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <TrendingDown size={13}/> {l.drop_from_previous}%
                    </span>
                  )}
                </span>
              </div>
              <ProgressBar value={l.completion_rate} />
            </div>
          ))}
        </div></div>
      )}
    </DashboardLayout>
  )
}
