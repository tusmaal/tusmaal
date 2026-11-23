import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, Badge } from '../../components/common/index.jsx'
import { adminAPI, courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Download } from 'lucide-react'

export default function Payments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ student_id: '', course_id: '', amount: '', currency: 'USD', payment_method: 'EVC Plus', payment_reference: '', payment_date: new Date().toISOString().split('T')[0], notes: '' })

  const load = () => {
    setLoading(true)
    adminAPI.getPayments().then(r => setPayments(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    adminAPI.getUsers({ role: 'student', limit: 200 }).then(r => setStudents(r.data.data))
    courseAPI.list({ limit: 100 }).then(r => setCourses(r.data.data))
  }, [])

  // Auto-open the create modal when arriving via "Log Payment" (?new=1).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowModal(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await adminAPI.createPayment(form)
      toast.success('Payment recorded!')
      setShowModal(false)
      setForm({ student_id: '', course_id: '', amount: '', currency: 'USD', payment_method: 'EVC Plus', payment_reference: '', payment_date: new Date().toISOString().split('T')[0], notes: '' })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const total = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const totalRevenueLabel = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <DashboardLayout title="Payment Log">
      <div className="page-header">
        <div>
          <h1>Payment Log</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Track all manual payments received</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Log Payment</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          ['Total Revenue', totalRevenueLabel, '#dcfce7', 'var(--success)'],
          ['Payments Recorded', payments.length, '#dbeafe', 'var(--primary)'],
        ].map(([l, v, bg, color]) => (
          <div key={l} className="stat-card">
            <div className="stat-icon" style={{ background: bg, color }}><Download size={22} /></div>
            <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
              <div
                className="stat-value"
                style={{
                  fontSize: l === 'Total Revenue'
                    ? 'clamp(0.9rem, 1.3vw, 1.45rem)'
                    : 'clamp(1rem, 1.5vw, 1.6rem)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.15
                }}
                title={String(v)}
              >
                {v}
              </div>
              <div className="stat-label">{l}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Student</th><th>Course</th><th>Amount</th><th>Method</th><th>Reference</th><th>Recorded By</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><Spinner /></td></tr>
                : payments.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No payments yet.</td></tr>
                : payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.student_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.student_email}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.course_title}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--success)' }}>${parseFloat(p.amount).toFixed(2)}</span> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.currency}</span></td>
                    <td><Badge variant="primary">{p.payment_method || '—'}</Badge></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.payment_reference || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.recorded_by_name}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Manual Payment"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? <Spinner size={16} /> : 'Save Payment'}</button>
        </>}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Student *</label>
            <select className="form-control" required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.email}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Course *</label>
            <select className="form-control" required value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}>
              <option value="">Select course...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title} — ${c.price}</option>)}
            </select>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input className="form-control" type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-control" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option>USD</option><option>SOS</option><option>EUR</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-control" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
              {['EVC Plus', 'eDahab', 'Zaad', 'Bank Transfer', 'Cash', 'Other'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reference / Transaction ID</label>
            <input className="form-control" value={form.payment_reference} onChange={e => setForm({ ...form, payment_reference: e.target.value })} placeholder="e.g. EVC-20240115-001" />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Date *</label>
            <input className="form-control" type="date" required value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
