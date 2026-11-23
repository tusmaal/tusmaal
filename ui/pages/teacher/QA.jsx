import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, ConfirmModal, Badge, EmptyState, StatCard } from '../../components/common/index.jsx'
import { slaAPI, faqAPI, courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { MessageSquare, Clock, AlertTriangle, CheckCircle, Plus, Edit, Trash2, HelpCircle } from 'lucide-react'

export default function QA() {
  const [tab, setTab] = useState('inbox')
  const [metrics, setMetrics] = useState(null)
  const [inbox, setInbox] = useState([])
  const [loading, setLoading] = useState(true)

  // FAQ state
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [faqs, setFaqs] = useState([])
  const [showFaq, setShowFaq] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [fForm, setFForm] = useState({ question: '', answer: '', order_index: 0 })

  useEffect(() => {
    Promise.all([
      slaAPI.metrics().then(r => setMetrics(r.data.data)),
      slaAPI.inbox().then(r => setInbox(r.data.data || [])),
    ]).finally(() => setLoading(false))
    courseAPI.my().then(r => { const cs = r.data.data || []; setCourses(cs); if (cs[0]) setCourseId(cs[0].id) }).catch(() => {})
  }, [])

  useEffect(() => { if (courseId) faqAPI.list(courseId).then(r => setFaqs(r.data.data || [])) }, [courseId])

  const openFaq = (f = null) => { setEditing(f); setFForm(f ? { question: f.question, answer: f.answer, order_index: f.order_index } : { question: '', answer: '', order_index: faqs.length }); setShowFaq(true) }
  const saveFaq = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await faqAPI.update(editing.id, fForm); toast.success('FAQ updated') }
      else { await faqAPI.create(courseId, fForm); toast.success('FAQ added') }
      setShowFaq(false); faqAPI.list(courseId).then(r => setFaqs(r.data.data || []))
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }
  const delFaq = async () => {
    setSaving(true)
    try { await faqAPI.delete(deleting.id); toast.success('Deleted'); setDeleting(null); faqAPI.list(courseId).then(r => setFaqs(r.data.data || [])) }
    catch { toast.error('Failed') } finally { setSaving(false) }
  }

  return (
    <DashboardLayout title="Student Q&A">
      <div className="page-header"><h1>Student Q&A & Responsiveness</h1></div>

      {!loading && metrics && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <StatCard icon={<MessageSquare size={22}/>} label="Total Questions" value={metrics.total_questions} bg="#dbeafe" color="var(--primary)" />
          <StatCard icon={<CheckCircle size={22}/>} label="Answered" value={metrics.answered} bg="#dcfce7" color="var(--success)" />
          <StatCard icon={<AlertTriangle size={22}/>} label="Overdue (>24h)" value={metrics.overdue} bg="#fee2e2" color="var(--danger)" />
          <StatCard icon={<Clock size={22}/>} label="Avg Response" value={metrics.avg_response_hours != null ? `${metrics.avg_response_hours}h` : '—'} bg="#fef3c7" color="var(--warning)" />
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab-btn${tab === 'inbox' ? ' active' : ''}`} onClick={() => setTab('inbox')}><MessageSquare size={14}/> Unanswered ({inbox.length})</button>
        <button className={`tab-btn${tab === 'faqs' ? ' active' : ''}`} onClick={() => setTab('faqs')}><HelpCircle size={14}/> Course FAQs</button>
      </div>

      {loading ? <Spinner /> : tab === 'inbox' ? (
        !inbox.length ? (
          <EmptyState icon={<CheckCircle size={48}/>} title="All caught up!" description="No unanswered student questions. Great responsiveness builds trust." />
        ) : (
          <div className="card"><div className="card-body" style={{ padding: 0 }}>
            {inbox.map(q => (
              <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '14px 18px', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>{q.body}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {q.student_name} · {q.course_title} → {q.lesson_title}
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Badge variant={q.overdue ? 'danger' : 'warning'}>{q.overdue ? 'Overdue' : `${q.waiting_hours}h waiting`}</Badge>
                  <div style={{ marginTop: 6 }}>
                    <Link className="btn btn-secondary btn-sm" to={`/teacher/courses/${q.course_id}`}>Open course</Link>
                  </div>
                </div>
              </div>
            ))}
          </div></div>
        )
      ) : (
        <>
          <div className="page-header" style={{ marginTop: 0 }}>
            <select className="form-control" style={{ maxWidth: 280 }} value={courseId} onChange={e => setCourseId(e.target.value)}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              {!courses.length && <option>No courses</option>}
            </select>
            <button className="btn btn-primary" onClick={() => openFaq()} disabled={!courseId}><Plus size={16}/> Add FAQ</button>
          </div>
          {!faqs.length ? (
            <EmptyState icon={<HelpCircle size={48}/>} title="No FAQs yet" description="Pin common questions and answers so students get help instantly." />
          ) : (
            <div className="card"><div className="card-body">
              {faqs.map(f => (
                <div key={f.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{f.question}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{f.answer}</div>
                    </div>
                    <div style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openFaq(f)}><Edit size={13}/></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(f)}><Trash2 size={13}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div></div>
          )}
        </>
      )}

      <Modal open={showFaq} onClose={() => setShowFaq(false)} title={editing ? 'Edit FAQ' : 'Add FAQ'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowFaq(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveFaq} disabled={saving}>{saving ? <Spinner size={16}/> : 'Save'}</button>
        </>}>
        <form onSubmit={saveFaq}>
          <div className="form-group"><label className="form-label">Question *</label>
            <input className="form-control" required value={fForm.question} onChange={e => setFForm({ ...fForm, question: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Answer *</label>
            <textarea className="form-control" rows={3} required value={fForm.answer} onChange={e => setFForm({ ...fForm, answer: e.target.value })} /></div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={delFaq} loading={saving}
        title="Delete FAQ" message="Delete this FAQ?" />
    </DashboardLayout>
  )
}
