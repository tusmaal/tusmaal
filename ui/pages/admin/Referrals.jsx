import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Spinner, Badge, EmptyState, StatCard } from '../../components/common/index.jsx'
import { referralAPI } from '../../services/api'
import { Share2, UserPlus, CheckCircle, Gift } from 'lucide-react'

export default function Referrals() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { referralAPI.adminList().then(r => setRows(r.data.data || [])).finally(() => setLoading(false)) }, [])

  const total = rows.length
  const qualified = rows.filter(r => r.status !== 'pending').length
  const rewarded = rows.filter(r => r.status === 'rewarded').length

  const variant = s => s === 'rewarded' ? 'success' : s === 'qualified' ? 'primary' : 'warning'

  return (
    <DashboardLayout title="Referrals">
      <div className="page-header"><h1>Referral Program</h1></div>

      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <StatCard icon={<UserPlus size={22}/>} label="Total Referrals" value={total} bg="#dbeafe" color="var(--primary)" />
        <StatCard icon={<CheckCircle size={22}/>} label="Qualified (enrolled)" value={qualified} bg="#dcfce7" color="var(--success)" />
        <StatCard icon={<Gift size={22}/>} label="Rewards Issued" value={rewarded} bg="#f3e8ff" color="#7c3aed" />
      </div>

      {loading ? <Spinner /> : !rows.length ? (
        <EmptyState icon={<Share2 size={48}/>} title="No referrals yet"
          description="Students earn a reward coupon when a friend they referred enrolls in their first course." />
      ) : (
        <div className="table-wrap">
          <table className="table" style={{ width: '100%' }}>
            <thead><tr><th>Referrer</th><th>Referred Friend</th><th>Status</th><th>Reward Code</th><th>Date</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.referrer_name}<div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.referrer_email}</div></td>
                  <td>{r.referred_name}<div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.referred_email}</div></td>
                  <td><Badge variant={variant(r.status)}>{r.status}</Badge></td>
                  <td>{r.reward_code ? <code>{r.reward_code}</code> : '—'}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
