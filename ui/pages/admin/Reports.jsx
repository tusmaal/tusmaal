import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { LoadingScreen, StatCard } from '../../components/common/index.jsx'
import { reportsAPI } from '../../services/api'
import { BarChart2, Users, BookOpen, CreditCard, Download, TrendingUp } from 'lucide-react'

export default function Reports() {
  const [overview, setOverview] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    Promise.all([reportsAPI.overview(), reportsAPI.monthly()])
      .then(([o, m]) => { setOverview(o.data.data); setMonthly(m.data.data) })
      .finally(() => setLoading(false))
  }, [])

  const downloadCSV = async (type) => {
    const endpoints = { enrollments: reportsAPI.enrollments, students: reportsAPI.students, courses: reportsAPI.courses, revenue: reportsAPI.revenue }
    const res = await endpoints[type]({ format: 'csv' })
    const blob = new Blob([res.data], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${type}.csv`; a.click()
  }

  if (loading) return <DashboardLayout title="Reports"><LoadingScreen /></DashboardLayout>

  const { users, courses, revenue } = overview || {}
  const maxRevenue = Math.max(...monthly.map(m => parseFloat(m.revenue) || 0), 1)

  return (
    <DashboardLayout title="Reports">
      <div className="page-header">
        <h1>Analytics & Reports</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['enrollments','students','courses','revenue'].map(t => (
            <button key={t} className="btn btn-outline btn-sm" onClick={() => downloadCSV(t)}>
              <Download size={13} /> {t}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <StatCard icon={<Users size={22}/>} label="Total Students" value={users?.total_students||0} bg="#dbeafe" color="var(--primary)" />
        <StatCard icon={<Users size={22}/>} label="New (30 days)" value={users?.new_users_30d||0} bg="#dcfce7" color="var(--success)" />
        <StatCard icon={<BookOpen size={22}/>} label="Published Courses" value={courses?.published||0} bg="#fef3c7" color="var(--warning)" />
        <StatCard icon={<CreditCard size={22}/>} label="Total Revenue" value={`$${parseFloat(revenue?.total_revenue||0).toFixed(0)}`} bg="#f3e8ff" color="#7c3aed" />
      </div>

      {/* Monthly chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h3 style={{ marginBottom: 24, fontSize: 16 }}>Monthly Overview (Last 12 Months)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, overflow: 'auto' }}>
            {monthly.map(m => (
              <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>${parseFloat(m.revenue||0).toFixed(0)}</div>
                <div style={{ width: 40, background: 'linear-gradient(to top, var(--primary), var(--primary-light))', borderRadius: '4px 4px 0 0', height: Math.max(4, (parseFloat(m.revenue||0) / maxRevenue) * 140), transition: 'height 0.5s ease' }} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{m.month?.slice(5)}</div>
              </div>
            ))}
          </div>

          <div className="reports-stats-grid">
            {monthly.slice(-1).map(m => (
              <>
                {[['New Students', m.new_students], ['Enrollments', m.new_enrollments], ['Certificates', m.certificates_issued], ['Revenue', `$${parseFloat(m.revenue||0).toFixed(0)}`]].map(([l,v]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)' }}>{v}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l} this month</div>
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly table */}
      <div className="card">
        <div className="card-body">
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Monthly Breakdown</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Month</th><th>New Students</th><th>Enrollments</th><th>Certificates</th><th>Revenue</th></tr></thead>
              <tbody>
                {[...monthly].reverse().map(m => (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 500 }}>{m.month}</td>
                    <td>{m.new_students}</td>
                    <td>{m.new_enrollments}</td>
                    <td>{m.certificates_issued}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>${parseFloat(m.revenue||0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
