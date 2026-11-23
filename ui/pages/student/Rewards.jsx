import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Spinner, Badge, StatCard, Alert } from '../../components/common/index.jsx'
import { referralAPI, couponAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Gift, Copy, Share2, Ticket, Wallet, CheckCircle, Clock } from 'lucide-react'

export default function Rewards() {
  const [ref, setRef] = useState(null)
  const [credits, setCredits] = useState({ total: 0, credits: [] })
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState(null)

  useEffect(() => {
    Promise.all([
      referralAPI.me().then(r => setRef(r.data.data)),
      referralAPI.credits().then(r => setCredits(r.data.data || { total: 0, credits: [] })),
      couponAPI.mine().then(r => setCoupons(r.data.data || [])),
    ]).finally(() => setLoading(false))
  }, [])

  const copy = (text, label) => { navigator.clipboard?.writeText(text); toast.success(`${label} copied!`) }

  const checkCode = async () => {
    if (!code.trim()) return
    setChecking(true); setCheckResult(null)
    try {
      const r = await couponAPI.validate({ code: code.trim(), amount: 100 })
      setCheckResult({ ok: true, ...r.data.data })
    } catch (err) {
      setCheckResult({ ok: false, message: err.response?.data?.message || 'Invalid code' })
    } finally { setChecking(false) }
  }

  const statusVariant = s => s === 'rewarded' ? 'success' : s === 'qualified' ? 'primary' : 'warning'

  if (loading) return <DashboardLayout title="Rewards"><Spinner /></DashboardLayout>

  return (
    <DashboardLayout title="Refer & Earn">
      <div className="page-header"><h1>Refer & Earn</h1></div>

      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <StatCard icon={<Share2 size={22}/>} label="Friends Referred" value={ref?.stats?.total_referred || 0} bg="#dbeafe" color="var(--primary)" />
        <StatCard icon={<CheckCircle size={22}/>} label="Enrolled" value={ref?.stats?.qualified || 0} bg="#dcfce7" color="var(--success)" />
        <StatCard icon={<Wallet size={22}/>} label="Credit Balance" value={`$${(credits.total || 0).toFixed(2)}`} bg="#f3e8ff" color="#7c3aed" />
      </div>

      {/* Referral link */}
      <div className="card" style={{ marginBottom: 24 }}><div className="card-body">
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>Your referral link</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          Share it with friends. When a friend you referred enrolls in their first course, you get a <strong>15% off</strong> reward coupon. 🎉
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input className="form-control" readOnly value={ref?.referral_link || ''} style={{ flex: 1, minWidth: 240 }} />
          <button className="btn btn-primary" onClick={() => copy(ref?.referral_link, 'Link')}><Copy size={15}/> Copy link</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your code:</span>
          <code style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>{ref?.referral_code}</code>
          <button className="btn btn-ghost btn-sm" onClick={() => copy(ref?.referral_code, 'Code')}><Copy size={13}/></button>
        </div>
      </div></div>

      {/* My coupons */}
      <div className="card" style={{ marginBottom: 24 }}><div className="card-body">
        <h3 style={{ fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Ticket size={18}/> My Coupons</h3>
        {!coupons.length ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No coupons yet. Finish a course or refer a friend to earn discounts.</p>
        ) : (
          <div className="grid-2">
            {coupons.map(c => (
              <div key={c.id} style={{ border: '1px dashed var(--brand-secondary)', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{c.code}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {c.expires_at ? `Expires ${new Date(c.expires_at).toLocaleDateString()}` : 'No expiry'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge variant="success">{c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value}`} off</Badge>
                  <div style={{ marginTop: 6 }}><button className="btn btn-ghost btn-sm" onClick={() => copy(c.code, 'Code')}><Copy size={12}/></button></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div></div>

      {/* Check a code */}
      <div className="card" style={{ marginBottom: 24 }}><div className="card-body">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Have a promo code?</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="form-control" placeholder="Enter code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ flex: 1, minWidth: 200 }} />
          <button className="btn btn-secondary" onClick={checkCode} disabled={checking}>{checking ? <Spinner size={16}/> : 'Check'}</button>
        </div>
        {checkResult && (
          <div style={{ marginTop: 12 }}>
            {checkResult.ok
              ? <Alert type="success">Valid! {checkResult.discount_type === 'percent' ? `${checkResult.discount_value}%` : `$${checkResult.discount_value}`} off — show this code to admin when paying for your course.</Alert>
              : <Alert type="error">{checkResult.message}</Alert>}
          </div>
        )}
      </div></div>

      {/* Referral history */}
      {ref?.referrals?.length > 0 && (
        <div className="card"><div className="card-body">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Your referrals</h3>
          {ref.referrals.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 14 }}>
              <span>{r.referred_name}</span>
              <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
            </div>
          ))}
        </div></div>
      )}
    </DashboardLayout>
  )
}
