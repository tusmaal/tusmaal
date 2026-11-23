import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Spinner, EmptyState, Badge } from '../../components/common/index.jsx'
import { liveAPI } from '../../services/api'
import { Video, Calendar, Clock, ExternalLink } from 'lucide-react'

export default function StudentLiveClasses() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { liveAPI.mine().then(r => setSessions(r.data.data || [])).finally(() => setLoading(false)) }, [])

  const soon = dt => (new Date(dt) - new Date()) < 60 * 60 * 1000 && new Date(dt) > new Date()

  return (
    <DashboardLayout title="Live Classes">
      <div className="page-header"><h1>Upcoming Live Classes</h1></div>

      {loading ? <Spinner /> : !sessions.length ? (
        <EmptyState icon={<Video size={48}/>} title="No live classes scheduled"
          description="When your instructor schedules a live session, it'll show up here with a join link." />
      ) : (
        <div className="grid-2">
          {sessions.map(s => {
            const when = new Date(s.scheduled_at)
            return (
              <div key={s.id} className="card"><div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <h3 style={{ fontSize: 16 }}>{s.title}</h3>
                  {soon(s.scheduled_at) ? <Badge variant="success">Starting soon</Badge> : <Badge variant="primary">{s.provider}</Badge>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0' }}>{s.course_title}</div>
                {s.description && <p style={{ fontSize: 13, margin: '6px 0' }}>{s.description}</p>}
                <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
                  <Calendar size={14}/> {when.toLocaleString()}
                  <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}><Clock size={13}/> {s.duration_minutes} min</span>
                </div>
                <a className="btn btn-primary btn-sm" href={s.meeting_url} target="_blank" rel="noreferrer" style={{ marginTop: 6 }}>
                  <ExternalLink size={14}/> Join class
                </a>
              </div></div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
