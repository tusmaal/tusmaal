import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { LoadingScreen, EmptyState } from '../../components/common/index.jsx'
import { studentAPI } from '../../services/api'
import { Megaphone } from 'lucide-react'

export default function StudentAnnouncements() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentAPI.announcements().then(r => setItems(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLayout title="Announcements"><LoadingScreen /></DashboardLayout>

  return (
    <DashboardLayout title="Announcements">
      <div className="page-header"><h1>Announcements</h1></div>
      {items.length === 0 ? (
        <EmptyState icon={<Megaphone size={48}/>} title="No announcements" description="No announcements have been posted yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(a => (
            <div key={a.id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {a.is_global && <span className="badge badge-accent">📢 Global</span>}
                      {a.course_title && <span className="badge badge-primary">{a.course_title}</span>}
                    </div>
                    <h3 style={{ fontSize: 17 }}>{a.title}</h3>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 16 }}>
                    {new Date(a.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{a.body}</p>
                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                  By <strong style={{ color: 'var(--text)' }}>{a.author}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
