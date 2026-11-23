import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, Spinner, Badge, LoadingScreen, ProgressBar } from '../../components/common/index.jsx'
import HlsVideoPlayer from '../../components/common/HlsVideoPlayer.jsx'
import { courseAPI, quizAPI, assignmentAPI, teacherAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, Users, BarChart2, Play, FileText, BookOpen, Loader2 } from 'lucide-react'

export default function CourseBuilder() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [sections, setSections] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('content')
  const [openSec, setOpenSec] = useState({})
  const [saving, setSaving] = useState(false)

  // Modals
  const [secModal, setSecModal] = useState(false)
  const [secForm, setSecForm] = useState({ title: '', description: '' })
  const [lessonModal, setLessonModal] = useState(null)
  const [lessonForm, setLessonForm] = useState({ title: '', content_type: 'youtube', youtube_url: '', text_content: '', duration_minutes: '' })
  const [previewLesson, setPreviewLesson] = useState(null)
  const [uploadProgress, setUploadProgress] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const [secs, stus] = await Promise.all([
        courseAPI.getSections(courseId),
        teacherAPI.courseStudents(courseId)
      ])
      setSections(secs.data.data || [])
      setStudents(stus.data.data || [])
      if (secs.data.data?.length > 0) setOpenSec({ [secs.data.data[0].id]: true })
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [courseId])

  const addSection = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await courseAPI.createSection(courseId, { ...secForm, order_index: sections.length })
      toast.success('Section added!'); setSecModal(false); setSecForm({ title: '', description: '' }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const deleteSection = async sid => {
    if (!confirm('Delete this section and all its lessons?')) return
    try { await courseAPI.deleteSection(courseId, sid); toast.success('Section deleted'); load() }
    catch { toast.error('Failed') }
  }

  const addLesson = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const isMuxVideo = lessonForm.content_type === 'video'
      if (isMuxVideo && !lessonForm.videoFile) {
        toast.error('Please select a video file first.')
        return
      }

      const fd = new FormData()
      Object.entries({ ...lessonForm, order_index: 0 }).forEach(([k, v]) => {
        if (k === 'videoFile' || k === 'pdfFile') return
        if (v !== '') fd.append(k, v)
      })

      // Keep local PDF uploads as-is.
      if (lessonForm.pdfFile) fd.append('pdf', lessonForm.pdfFile)

      const createRes = await courseAPI.createLesson(courseId, lessonModal, fd)
      const createdLesson = createRes.data.data

      if (isMuxVideo && lessonForm.videoFile) {
        setUploadProgress(prev => ({ ...prev, [createdLesson.id]: 0 }))
        load()

        const uploadRes = await courseAPI.createLessonUploadUrl(createdLesson.id)
        const uploadUrl = uploadRes.data.data.upload_url

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', lessonForm.videoFile.type || 'application/octet-stream')

          xhr.upload.onprogress = evt => {
            if (!evt.lengthComputable) return
            const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)))
            setUploadProgress(prev => ({ ...prev, [createdLesson.id]: pct }))
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error('Mux upload failed'))
          }
          xhr.onerror = () => reject(new Error('Mux upload failed'))
          xhr.send(lessonForm.videoFile)
        })
        setUploadProgress(prev => ({ ...prev, [createdLesson.id]: 100 }))
        toast.success('Video uploaded. Mux is processing it now...')
      } else {
        toast.success('Lesson added!')
      }

      setLessonModal(null)
      setLessonForm({ title: '', content_type: 'youtube', youtube_url: '', text_content: '', duration_minutes: '' }); load()
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Failed') }
    finally { setSaving(false) }
  }

  const deleteLesson = async lid => {
    if (!confirm('Delete this lesson?')) return
    try { await courseAPI.deleteLesson(courseId, lid); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const getYouTubeId = url => {
    const m = url?.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
    return m ? m[1] : null
  }

  if (loading) return <DashboardLayout title="Course Builder"><LoadingScreen /></DashboardLayout>

  const iconFor = t => t === 'video' || t === 'youtube' ? <Play size={13}/> : <FileText size={13}/>

  return (
    <DashboardLayout title="Course Builder">
      <div className="page-header">
        <div>
          <Link to="/teacher/courses" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← My Courses</Link>
          <h1 style={{ marginTop: 4 }}>{course?.title || 'Course Builder'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-muted">{sections.reduce((s,sec)=>s+(sec.lessons?.length||0),0)} lessons</span>
          <span className="badge badge-success">{students.length} students</span>
        </div>
      </div>

      <div className="tabs">
        {[['content','Content'],['students','Students (' + students.length + ')']].map(([v,l]) => (
          <button key={v} className={`tab-btn${activeTab===v?' active':''}`} onClick={()=>setActiveTab(v)}>{l}</button>
        ))}
      </div>

      {activeTab === 'content' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setSecModal(true)}><Plus size={14}/> Add Section</button>
          </div>

          {sections.length === 0 && (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              <BookOpen size={40} style={{ opacity: 0.2, marginBottom: 14 }} />
              <p>No sections yet. Add your first section to start building your course.</p>
            </div>
          )}

          {sections.map((sec, si) => (
            <div key={sec.id} className="card" style={{ marginBottom: 14 }}>
              <button style={{ width: '100%', padding: '14px 20px', border: 'none', background: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setOpenSec(p => ({ ...p, [sec.id]: !p[sec.id] }))}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {openSec[sec.id] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  <span style={{ fontWeight: 600 }}>Section {si+1}: {sec.title}</span>
                  <Badge variant="muted">{sec.lessons?.length||0} lessons</Badge>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                  onClick={e => { e.stopPropagation(); deleteSection(sec.id) }}>
                  <Trash2 size={14}/>
                </button>
              </button>

              {openSec[sec.id] && (
                <div style={{ borderTop: '1px solid var(--border-soft)' }}>
                  {sec.lessons?.map(l => (
                    <div
                      key={l.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid var(--border-soft)', fontSize: 13, cursor: 'pointer' }}
                      onClick={() => setPreviewLesson(l)}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>{iconFor(l.content_type)}</span>
                      <span style={{ flex: 1 }}>{l.title}</span>
                      <Badge variant="muted">{l.content_type}</Badge>
                      {l.content_type === 'video' && l.mux_status && l.mux_status !== 'ready' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge variant={l.mux_status === 'failed' ? 'danger' : 'warning'}>
                            {l.mux_status}
                          </Badge>
                          {l.mux_status === 'uploading' && uploadProgress[l.id] !== undefined && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                              <Loader2 size={12} className="spin-upload" />
                              {uploadProgress[l.id]}%
                            </span>
                          )}
                        </div>
                      )}
                      {l.duration_minutes > 0 && <span style={{ color: 'var(--text-muted)' }}>{l.duration_minutes}min</span>}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={e => { e.stopPropagation(); deleteLesson(l.id) }}
                      >
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  ))}
                  <div style={{ padding: '10px 20px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setLessonModal(sec.id); setLessonForm({ title: '', content_type: 'youtube', youtube_url: '', text_content: '', duration_minutes: '' }) }}>
                      <Plus size={13}/> Add Lesson
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Progress</th><th>Last Activity</th><th>Certificate</th></tr></thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No students enrolled yet.</td></tr>
                ) : students.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ProgressBar value={parseFloat(s.progress_pct)||0} />
                        <span style={{ fontSize: 13, fontWeight: 500, minWidth: 36 }}>{s.progress_pct||0}%</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.completed_lessons}/{s.total_lessons} lessons</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {s.last_activity ? new Date(s.last_activity).toLocaleDateString() : 'Never'}
                    </td>
                    <td>{s.certificate_issued_at ? <Badge variant="success">Earned</Badge> : <Badge variant="muted">—</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add section modal */}
      <Modal open={secModal} onClose={() => setSecModal(false)} title="Add Section"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setSecModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={addSection} disabled={saving}>{saving ? <Spinner size={16}/> : 'Add Section'}</button>
        </>}>
        <form onSubmit={addSection}>
          <div className="form-group">
            <label className="form-label">Section Title *</label>
            <input className="form-control" required value={secForm.title} onChange={e => setSecForm({ ...secForm, title: e.target.value })} placeholder="e.g. Module 1: Introduction" />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-control" rows={2} value={secForm.description} onChange={e => setSecForm({ ...secForm, description: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* Add lesson modal */}
      <Modal open={!!lessonModal} onClose={() => setLessonModal(null)} title="Add Lesson"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setLessonModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={addLesson} disabled={saving}>{saving ? <Spinner size={16}/> : 'Add Lesson'}</button>
        </>}>
        <form onSubmit={addLesson}>
          <div className="form-group">
            <label className="form-label">Lesson Title *</label>
            <input className="form-control" required value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Content Type</label>
            <select className="form-control" value={lessonForm.content_type} onChange={e => setLessonForm({ ...lessonForm, content_type: e.target.value })}>
              <option value="youtube">YouTube Video</option>
              <option value="video">Upload Video</option>
              <option value="pdf">PDF Document</option>
              <option value="text">Text Content</option>
            </select>
          </div>
          {lessonForm.content_type === 'youtube' && (
            <div className="form-group">
              <label className="form-label">YouTube URL</label>
              <input className="form-control" type="url" value={lessonForm.youtube_url} onChange={e => setLessonForm({ ...lessonForm, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
            </div>
          )}
          {lessonForm.content_type === 'video' && (
            <div className="form-group">
              <label className="form-label">Upload Video (MP4)</label>
              <input className="form-control" type="file" accept="video/*" onChange={e => setLessonForm({ ...lessonForm, videoFile: e.target.files[0] })} />
            </div>
          )}
          {lessonForm.content_type === 'pdf' && (
            <div className="form-group">
              <label className="form-label">Upload PDF</label>
              <input className="form-control" type="file" accept=".pdf" onChange={e => setLessonForm({ ...lessonForm, pdfFile: e.target.files[0] })} />
            </div>
          )}
          {lessonForm.content_type === 'text' && (
            <div className="form-group">
              <label className="form-label">Text Content</label>
              <textarea className="form-control" rows={5} value={lessonForm.text_content} onChange={e => setLessonForm({ ...lessonForm, text_content: e.target.value })} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <input className="form-control" type="number" min="0" value={lessonForm.duration_minutes} onChange={e => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!previewLesson}
        onClose={() => setPreviewLesson(null)}
        title={`Lesson Preview — ${previewLesson?.title || ''}`}
      >
        {previewLesson && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {previewLesson.content_type}
            </div>

            {previewLesson.content_type === 'youtube' && previewLesson.youtube_url && (
              <div className="video-player-wrap">
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(previewLesson.youtube_url)}?autoplay=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {previewLesson.content_type === 'video' && previewLesson.mux_playback_id && (
              <HlsVideoPlayer src={`https://stream.mux.com/${previewLesson.mux_playback_id}.m3u8`} />
            )}

            {previewLesson.content_type === 'video' && !previewLesson.mux_playback_id && previewLesson.video_url && (
              <div className="video-player-wrap">
                <video controls src={previewLesson.video_url} />
              </div>
            )}

            {previewLesson.content_type === 'video' && !previewLesson.mux_playback_id && !previewLesson.video_url && (
              <div className="alert alert-info">
                {previewLesson.mux_status === 'failed'
                  ? `Video processing failed: ${previewLesson.mux_error || 'Unknown error'}`
                  : `Video is not ready yet (${previewLesson.mux_status || 'processing'}).`}
              </div>
            )}

            {previewLesson.content_type === 'pdf' && previewLesson.pdf_url && (
              <div className="video-player-wrap">
                <iframe src={previewLesson.pdf_url} />
              </div>
            )}

            {previewLesson.content_type === 'text' && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, maxHeight: 420, overflowY: 'auto' }}>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text)' }}>
                  {previewLesson.text_content || 'No text content provided.'}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
      <style>{`.spin-upload{animation:spin 0.9s linear infinite}`}</style>
    </DashboardLayout>
  )
}
