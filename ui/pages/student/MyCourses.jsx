import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { LoadingScreen, ProgressBar, EmptyState } from '../../components/common/index.jsx'
import { studentAPI } from '../../services/api'
import { BookOpen, Play } from 'lucide-react'

export default function StudentCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentAPI.courses().then(r => setCourses(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLayout title="My Courses"><LoadingScreen /></DashboardLayout>

  return (
    <DashboardLayout title="My Courses">
      <div className="page-header"><h1>My Courses</h1></div>
      {courses.length === 0 ? (
        <EmptyState icon={<BookOpen size={48}/>} title="No courses yet"
          description="You haven't been enrolled in any courses yet. Contact admin after payment."
          action={<Link to="/courses" className="btn btn-primary">Browse Courses</Link>} />
      ) : (
        <div className="grid-3">
          {courses.map(c => (
            <Link key={c.id} to={`/student/courses/${c.id}`} className="course-card">
              <div className="course-card-img">
                {c.thumbnail
                  ? <img src={c.thumbnail} alt={c.title}/>
                  : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,var(--primary),var(--primary-light))' }}><BookOpen size={36} color="rgba(255,255,255,0.4)"/></div>}
              </div>
              <div className="course-card-body">
                <div className="course-card-title">{c.title}</div>
                <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:12 }}>by {c.teacher_name}</div>
                <ProgressBar value={parseFloat(c.progress_pct)||0}/>
                <div style={{ display:'flex',justifyContent:'space-between',marginTop:8,fontSize:12,flexWrap:'wrap',gap:6 }}>
                  <span style={{ color:'var(--text-muted)' }}>{c.completed_lessons}/{c.total_lessons} lessons</span>
                  {c.expires_at && (
                    <span style={{ color:'var(--text-muted)' }}>
                      Access until {new Date(c.expires_at).toLocaleDateString()}
                    </span>
                  )}
                  <span style={{ fontWeight:700,color:parseFloat(c.progress_pct)>=100?'var(--success)':'var(--primary)' }}>{parseFloat(c.progress_pct)||0}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
