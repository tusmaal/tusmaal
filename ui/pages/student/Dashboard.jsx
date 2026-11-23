import { WHATSAPP_HREF } from '../../utils/whatsapp'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { StatCard, LoadingScreen, ProgressBar } from '../../components/common/index.jsx'
import { studentAPI, streakAPI } from '../../services/api'
import { BookOpen, Award, Clock, Play, Flame, Target, Trophy } from 'lucide-react'

export default function StudentDashboard() {
  const [data, setData] = useState(null)
  const [streak, setStreak] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentAPI.dashboard().then(r => setData(r.data.data)).finally(() => setLoading(false))
    streakAPI.get().then(r => setStreak(r.data.data)).catch(() => {})
  }, [])

  if (loading) return <DashboardLayout title="Dashboard"><LoadingScreen /></DashboardLayout>
  const { enrolled_courses, certificates_earned, courses, recent_activity } = data || {}
  const carrot = streak?.certificate_carrot

  return (
    <DashboardLayout title="My Dashboard">
      {/* Streak + daily goal + certificate carrot */}
      {streak && (
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card" style={{ background: streak.streak_alive
              ? 'linear-gradient(135deg, rgba(255,138,0,0.16), rgba(255,72,72,0.12))'
              : 'var(--bg-card)' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: streak.streak_alive ? 'linear-gradient(135deg,#ff8a00,#ff4848)' : 'var(--bg-2)', flexShrink: 0 }}>
                <Flame size={30} color={streak.streak_alive ? '#fff' : 'var(--text-muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                  {streak.current_streak} day{streak.current_streak === 1 ? '' : 's'} {streak.streak_alive ? '🔥' : ''}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  {streak.streak_alive
                    ? (streak.goal_met_today ? "Today's goal complete — keep it going!" : `Complete ${streak.daily_goal_lessons - streak.today_lessons} more lesson(s) today to keep your streak`)
                    : 'Complete a lesson today to start a new streak'}
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                    <span><Target size={11} style={{ verticalAlign: 'middle' }}/> Daily goal</span>
                    <span>{Math.min(streak.today_lessons, streak.daily_goal_lessons)}/{streak.daily_goal_lessons}</span>
                  </div>
                  <ProgressBar value={Math.min(streak.today_lessons, streak.daily_goal_lessons)} max={streak.daily_goal_lessons} />
                </div>
              </div>
              {streak.longest_streak > 0 && (
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <Trophy size={16} color="var(--brand-secondary)" />
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{streak.longest_streak}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>best</div>
                </div>
              )}
            </div>
          </div>

          {/* Certificate carrot */}
          {carrot ? (
            <Link to={`/student/courses/${carrot.course_id}`} className="card" style={{ textDecoration: 'none',
              background: 'linear-gradient(135deg, rgba(255,157,0,0.16), rgba(21,24,75,0.10))' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg,var(--brand-secondary),var(--brand-primary-light))', flexShrink: 0 }}>
                  <Award size={30} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    You're {carrot.progress_pct}% to your certificate
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                    Just {carrot.remaining} lesson{carrot.remaining === 1 ? '' : 's'} left in <strong>{carrot.title}</strong>
                  </div>
                  <ProgressBar value={carrot.progress_pct} />
                </div>
              </div>
            </Link>
          ) : (
            <div className="card"><div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, height: '100%' }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-2)', flexShrink: 0 }}>
                <Award size={30} color="var(--text-muted)" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Earn your first certificate</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Complete all lessons in a course to unlock a certificate.</div>
              </div>
            </div></div>
          )}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <StatCard icon={<BookOpen size={22}/>} label="Enrolled Courses" value={enrolled_courses||0} bg="#dbeafe" color="var(--primary)" />
        <StatCard icon={<Award size={22}/>} label="Certificates Earned" value={certificates_earned||0} bg="#dcfce7" color="var(--success)" />
        <StatCard icon={<Play size={22}/>} label="In Progress" value={courses?.filter(c=>c.completed_lessons>0&&c.progress_pct<100).length||0} bg="#fef3c7" color="var(--warning)" />
        <StatCard icon={<Award size={22}/>} label="Completed" value={courses?.filter(c=>c.progress_pct>=100).length||0} bg="#f3e8ff" color="#7c3aed" />
      </div>

      {/* Continue learning */}
      {courses?.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18 }}>Continue Learning</h3>
          <div className="grid-3">
            {courses.map(c => (
              <Link key={c.id} to={`/student/courses/${c.id}`} className="course-card" style={{ textDecoration: 'none' }}>
                <div className="course-card-img" style={{ height: 130 }}>
                  {c.thumbnail
                    ? <img src={c.thumbnail} alt={c.title} />
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,var(--primary),var(--primary-light))' }}><BookOpen size={36} color="rgba(255,255,255,0.4)"/></div>}
                </div>
                <div className="course-card-body">
                  <div className="course-card-title">{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{c.teacher_name}</div>
                  <ProgressBar value={parseFloat(c.progress_pct)||0} />
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:12, color:'var(--text-muted)' }}>
                    <span>{c.completed_lessons}/{c.total_lessons} lessons</span>
                    <span style={{ fontWeight:600, color: parseFloat(c.progress_pct)>=100 ? 'var(--success)' : 'var(--primary)' }}>
                      {parseFloat(c.progress_pct)||0}%
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recent_activity?.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Recent Activity</h3>
            {recent_activity.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border-soft)' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Play size={16} color="var(--primary)" />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500 }}>{a.lesson_title}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>{a.course_title}</div>
                </div>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date(a.updated_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!courses?.length && (
        <div className="card" style={{ padding:60, textAlign:'center', color:'var(--text-muted)' }}>
          <BookOpen size={48} style={{ opacity:0.2, marginBottom:16 }} />
          <h3 style={{ marginBottom:8, color:'var(--text)' }}>No courses yet</h3>
          <p style={{ fontSize:14, marginBottom:24 }}>Your account is active! Browse courses below — when you're ready to enroll, contact us on WhatsApp and we'll unlock your courses after payment.</p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
            <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="btn btn-secondary">WhatsApp to Enroll</a>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
