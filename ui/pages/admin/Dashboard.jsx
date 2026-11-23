import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { StatCard, LoadingScreen, Badge } from '../../components/common/index.jsx'
import { adminAPI } from '../../services/api'
import { Users, BookOpen, Award, CreditCard, UserPlus, ShieldCheck } from 'lucide-react'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.dashboard().then(r => setData(r.data.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLayout title="Dashboard"><LoadingScreen /></DashboardLayout>

  const { stats, recent_students, recent_payments } = data || {}

  return (
    <DashboardLayout title="Admin Dashboard">
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <StatCard icon={<Users size={22} />} label="Total Students" value={stats?.total_students || 0} bg="#dbeafe" color="var(--primary)" />
        <StatCard icon={<BookOpen size={22} />} label="Published Courses" value={stats?.published_courses || 0} bg="#dcfce7" color="var(--success)" />
        <StatCard icon={<Users size={22} />} label="Teachers" value={stats?.total_teachers || 0} bg="#fef3c7" color="var(--warning)" />
        <StatCard icon={<Award size={22} />} label="Total Courses" value={stats?.total_courses || 0} bg="#f3e8ff" color="#7c3aed" />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        <Link to="/admin/users?new=1" className="btn btn-primary"><UserPlus size={16} /> Add Student</Link>
        <Link to="/admin/access" className="btn btn-accent"><ShieldCheck size={16} /> Manage Access</Link>
        <Link to="/admin/payments?new=1" className="btn btn-outline"><CreditCard size={16} /> Log Payment</Link>
        <Link to="/admin/reports" className="btn btn-ghost"><BookOpen size={16} /> View Reports</Link>
      </div>

      <div className="grid-2">
        {/* Recent students */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16 }}>Recent Students</h3>
              <Link to="/admin/users?role=student" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            {recent_students?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No students yet.</p>}
            {recent_students?.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div className="avatar">{s.full_name?.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{s.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                </div>
                <Link to={`/admin/users/${s.id}`} className="btn btn-ghost btn-sm">View</Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent payments */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16 }}>Recent Payments</h3>
              <Link to="/admin/payments" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            {recent_payments?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No payments recorded.</p>}
            {recent_payments?.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={16} color="var(--success)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.student}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.course}</div>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>${p.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
