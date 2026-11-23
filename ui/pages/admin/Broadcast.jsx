import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, ConfirmModal, Badge, EmptyState } from '../../components/common/index.jsx'
import { broadcastAPI, courseAPI, couponAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Send, Mail, Users, Eye } from 'lucide-react'

const AUDIENCES = [
  { value: 'all_users', label: 'All users' },
  { value: 'all_students', label: 'All students' },
  { value: 'all_teachers', label: 'All teachers' },
  { value: 'course_students', label: 'Students in a course' },
  { value: 'active_students', label: 'Active students (last 14 days)' },
  { value: 'inactive_students', label: 'Inactive students (14+ days)' },
]

const STATUS_VARIANT = { draft: 'muted', sending: 'warning', sent: 'success', failed: 'danger' }

const TYPES = [
  { value: 'newsletter', label: '📰 Newsletter', hint: 'General news & updates' },
  { value: 'course_announcement', label: '🎓 New Course Announcement', hint: 'Feature a newly launched course' },
  { value: 'discount_announcement', label: '🔥 Discount Announcement', hint: 'Promote a coupon on a specific course' },
]
const TYPE_LABEL = { newsletter: 'Newsletter', course_announcement: 'New Course', discount_announcement: 'Discount' }

const blank = {
  campaign_type: 'newsletter', subject: '', body_html: '',
  audience: 'all_students', course_id: '', feature_course_id: '', coupon_id: '',
}

export default function Broadcast() {
  const [form, setForm] = useState(blank)
  const [courses, setCourses] = useState([])
  const [coupons, setCoupons] = useState([])
  const [previewCount, setPreviewCount] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [active, setActive] = useState(null) // currently-sending campaign (polled)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)

  const loadHistory = () => broadcastAPI.list().then(r => setHistory(r.data.data || [])).finally(() => setLoading(false))

  useEffect(() => {
    loadHistory()
    courseAPI.list().then(r => setCourses(r.data.data || [])).catch(() => {})
    couponAPI.list().then(r => setCoupons((r.data.data || []).filter(c => c.is_active))).catch(() => {})
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Reset preview whenever the audience selection changes.
  useEffect(() => { setPreviewCount(null) }, [form.audience, form.course_id])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const doPreview = async () => {
    if (form.audience === 'course_students' && !form.course_id) {
      toast.error('Select a course first'); return
    }
    setPreviewing(true)
    try {
      const r = await broadcastAPI.preview({ audience: form.audience, course_id: form.course_id || undefined })
      setPreviewCount(r.data.data.count)
    } catch (err) { toast.error(err.response?.data?.message || 'Preview failed') }
    finally { setPreviewing(false) }
  }

  const startPolling = (id) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await broadcastAPI.get(id)
        const c = r.data.data
        setActive(c)
        if (c.status === 'sent' || c.status === 'failed') {
          clearInterval(pollRef.current); pollRef.current = null
          toast[c.status === 'sent' ? 'success' : 'error'](
            c.status === 'sent' ? `Done — ${c.sent_count} sent` : 'Campaign failed to send'
          )
          loadHistory()
        }
      } catch { /* keep polling */ }
    }, 2000)
  }

  const doSend = async () => {
    setConfirmOpen(false); setSending(true)
    try {
      const needsCourse = form.campaign_type === 'course_announcement' || form.campaign_type === 'discount_announcement'
      const payload = {
        campaign_type: form.campaign_type,
        subject: form.subject,
        body_html: form.body_html,
        audience: form.audience,
        course_id: form.audience === 'course_students' ? form.course_id : undefined,
        feature_course_id: needsCourse ? form.feature_course_id : undefined,
        coupon_id: form.campaign_type === 'discount_announcement' ? form.coupon_id : undefined,
      }
      const r = await broadcastAPI.send(payload)
      const data = r.data.data
      toast.success(r.data.message)
      setForm(blank); setPreviewCount(null)
      if (data.status === 'sending') { setActive({ ...data, sent_count: 0, failed_count: 0 }); startPolling(data.id) }
      else loadHistory()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send') }
    finally { setSending(false) }
  }

  const audienceLabel = v => AUDIENCES.find(a => a.value === v)?.label || v
  const needsCourse = form.campaign_type === 'course_announcement' || form.campaign_type === 'discount_announcement'
  const isDiscount = form.campaign_type === 'discount_announcement'
  const canSend = form.subject.trim() && form.body_html.trim() &&
    !(form.audience === 'course_students' && !form.course_id) &&
    !(needsCourse && !form.feature_course_id) &&
    !(isDiscount && !form.coupon_id)

  return (
    <DashboardLayout title="Email Broadcast">
      <div className="page-header">
        <div>
          <h1>Email Broadcast</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Send newsletters, new-course announcements and promos to your audience.</p>
        </div>
      </div>

      {/* Compose */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          {/* Campaign type picker */}
          <div className="form-group">
            <label className="form-label">Campaign type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
              {TYPES.map(t => {
                const selected = form.campaign_type === t.value
                return (
                  <button key={t.value} type="button" onClick={() => update('campaign_type', t.value)}
                    style={{
                      textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${selected ? 'var(--brand-secondary)' : 'var(--border)'}`,
                      background: selected ? 'rgba(255,157,0,0.08)' : 'var(--bg-glass)',
                    }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.hint}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Featured / discounted course */}
          {needsCourse && (
            <div className="form-group">
              <label className="form-label">{isDiscount ? 'Course to discount *' : 'Course to feature *'}</label>
              <select className="form-control" value={form.feature_course_id} onChange={e => update('feature_course_id', e.target.value)}>
                <option value="">Select a course…</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}

          {/* Discount coupon (required for discount campaigns) */}
          {isDiscount && (
            <div className="form-group">
              <label className="form-label">Discount coupon *</label>
              <select className="form-control" value={form.coupon_id} onChange={e => update('coupon_id', e.target.value)}>
                <option value="">Select a coupon…</option>
                {coupons.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.discount_type === 'percent' ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                  </option>
                ))}
              </select>
              {!coupons.length && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>No active coupons. Create one in Coupons first.</p>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input className="form-control" value={form.subject}
              onChange={e => update('subject', e.target.value)} placeholder="New course just launched! 🎉" />
          </div>

          <div className="form-group">
            <label className="form-label">Message (basic HTML allowed)</label>
            <textarea className="form-control" rows={8} value={form.body_html}
              onChange={e => update('body_html', e.target.value)}
              placeholder={'<p>Hello,</p>\n<p>We just added a new course on...</p>'} style={{ fontFamily: 'monospace', fontSize: 13 }} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Audience</label>
              <select className="form-control" value={form.audience} onChange={e => update('audience', e.target.value)}>
                {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {form.audience === 'course_students' && (
              <div className="form-group">
                <label className="form-label">Course</label>
                <select className="form-control" value={form.course_id} onChange={e => update('course_id', e.target.value)}>
                  <option value="">Select…</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={doPreview} disabled={previewing}>
              {previewing ? <Spinner size={16} /> : <><Eye size={16} /> Preview recipients</>}
            </button>
            {previewCount !== null && (
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                <Users size={14} style={{ verticalAlign: 'middle' }} /> This will be sent to <strong style={{ color: 'var(--text)' }}>{previewCount}</strong> {previewCount === 1 ? 'person' : 'people'}.
              </span>
            )}
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
              onClick={() => setConfirmOpen(true)} disabled={!canSend || sending}>
              {sending ? <Spinner size={16} /> : <><Send size={16} /> Send</>}
            </button>
          </div>
        </div>
      </div>

      {/* Live progress for the campaign currently sending */}
      {active && active.status === 'sending' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Spinner size={20} />
            <div>
              <div style={{ fontWeight: 700 }}>Sending in progress…</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {active.sent_count + active.failed_count} / {active.recipients_count} processed
                {active.failed_count > 0 && ` · ${active.failed_count} failed`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="card">
        <div className="card-body">
          <h3 style={{ marginBottom: 16 }}>Campaign history</h3>
          {loading ? <Spinner /> : !history.length ? (
            <EmptyState icon={<Mail size={48} />} title="No campaigns yet"
              description="Your sent newsletters and announcements will appear here." />
          ) : (
            <div className="table-wrap">
              <table className="table" style={{ width: '100%' }}>
                <thead><tr>
                  <th>Subject</th><th>Type</th><th>Audience</th><th>Recipients</th><th>Sent</th><th>Status</th><th>Date</th>
                </tr></thead>
                <tbody>
                  {history.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.subject}</strong>
                        {c.feature_course_title && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📘 {c.feature_course_title}</div>}
                        {c.coupon_code && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🎟️ {c.coupon_code}</div>}
                      </td>
                      <td>{TYPE_LABEL[c.campaign_type] || 'Newsletter'}</td>
                      <td>{audienceLabel(c.audience)}{c.course_title ? ` · ${c.course_title}` : ''}</td>
                      <td>{c.recipients_count}</td>
                      <td>{c.sent_count}{c.failed_count > 0 && <span style={{ color: 'var(--danger)' }}> ({c.failed_count} failed)</span>}</td>
                      <td><Badge variant={STATUS_VARIANT[c.status] || 'muted'}>{c.status}</Badge></td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={doSend} loading={sending}
        title="Send broadcast"
        message={`Send "${form.subject}" to ${previewCount !== null ? previewCount : 'all matching'} recipient(s)? This cannot be undone.`} />
    </DashboardLayout>
  )
}
