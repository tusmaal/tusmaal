import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { StatCard, LoadingScreen, Badge, ProgressBar } from '../../components/common/index.jsx'
import { teacherAPI } from '../../services/api'
import { BookOpen, Users, ClipboardList, Clock, Plus } from 'lucide-react'

export default function TeacherDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    teacherAPI.dashboard().then(r => setData(r.data.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLayout title="Teacher Dashboard"><LoadingScreen /></DashboardLayout>
  const { stats, courses, recent_submissions } = data || {}

  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <StatCard icon={<BookOpen size={22}/>} label="My Courses" value={stats?.total_courses||0} bg="#dbeafe" color="var(--primary)" />
        <StatCard icon={<Users size={22}/>} label="Total Students" value={stats?.total_students||0} bg="#dcfce7" color="var(--success)" />
        <StatCard icon={<ClipboardList size={22}/>} label="Pending Grades" value={stats?.pending_grades||0} bg="#fef3c7" color="var(--warning)" />
        <StatCard icon={<BookOpen size={22}/>} label="Published" value={stats?.published_courses||0} bg="#f3e8ff" color="#7c3aed" />
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
        <Link to="/teacher/courses?new=1" className="btn btn-primary"><Plus size={16}/> New Course</Link>
        <Link to="/teacher/assignments" className="btn btn-outline"><ClipboardList size={16}/> Grade Assignments</Link>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16 }}>My Courses</h3>
              <Link to="/teacher/courses" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            {courses?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No courses yet. Create your first course!</p>}
            {courses?.map(c => (
              <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Link to={`/teacher/courses/${c.id}`} style={{ fontWeight: 500, fontSize: 14, color: 'var(--primary)' }}>{c.title}</Link>
                  <Badge variant={c.is_published ? 'success' : 'muted'}>{c.is_published ? 'Published' : 'Draft'}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                  <span>{c.total_students} students</span>
                  <span>{c.lesson_count} lessons</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16 }}>Recent Submissions</h3>
              <Link to="/teacher/assignments" className="btn btn-ghost btn-sm">Grade all</Link>
            </div>
            {recent_submissions?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No submissions yet.</p>}
            {recent_submissions?.map(s => (
              <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{s.student_name?.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.student_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.assignment_title}</div>
                </div>
                {s.grade != null
                  ? <Badge variant="success">Graded: {s.grade}</Badge>
                  : <Badge variant="warning">Pending</Badge>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
