import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { LoadingScreen, Spinner, Modal, Badge } from '../../components/common/index.jsx'
import HlsVideoPlayer from '../../components/common/HlsVideoPlayer.jsx'
import { studentAPI, progressAPI, commentAPI, assignmentAPI, quizAPI, funnelAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { CheckCircle, Play, FileText, Send, MessageCircle, ChevronLeft, ChevronRight, Lock, ChevronDown } from 'lucide-react'

const COMPLETION_MIN_WATCH_PCT = 30

const formatDuration = seconds => {
  if (!seconds || !isFinite(seconds)) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const lessonListDuration = lesson => {
  if (lesson.mux_duration_seconds) return formatDuration(lesson.mux_duration_seconds)
  if (lesson.duration_minutes) return `${lesson.duration_minutes} min`
  return ''
}

const buildFlatLessons = course =>
  (course?.sections || [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .flatMap(sec =>
      (sec.lessons || [])
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map(l => ({ ...l, section: sec }))
    )

const unlockedLessons = course =>
  buildFlatLessons(course).filter(l => !l.locked && !l.section?.locked)

const getYouTubeId = url => {
  const m = url?.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
  return m ? m[1] : null
}

const storedWatchPct = lesson => {
  if (!lesson || !['video', 'youtube'].includes(lesson.content_type)) return 0
  const dur = lesson.mux_duration_seconds || (lesson.duration_minutes ? lesson.duration_minutes * 60 : 0)
  if (!dur || !lesson.watch_time_seconds) return 0
  return Math.min(100, (lesson.watch_time_seconds / dur) * 100)
}

const lessonDurationSeconds = (lesson, playerDuration = 0) => {
  if (playerDuration > 0) return Math.round(playerDuration)
  if (lesson?.mux_duration_seconds) return lesson.mux_duration_seconds
  if (lesson?.duration_minutes) return lesson.duration_minutes * 60
  return 0
}

const LessonIcon = ({ type }) => {
  if (type === 'video' || type === 'youtube') return <Play size={12} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
  if (type === 'pdf') return <FileText size={12} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
  return <FileText size={12} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
}

export default function CoursePlayer() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [currentLesson, setCurrentLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [assignmentModal, setAssignmentModal] = useState(null)
  const [assignmentForm, setAssignmentForm] = useState({ submission_text: '', file: null })
  const [mySubmission, setMySubmission] = useState(null)
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const [submittingAssignment, setSubmittingAssignment] = useState(false)
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizResults, setQuizResults] = useState([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizSubmitting, setQuizSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('lesson')
  const [watchPct, setWatchPct] = useState(0)
  const [playerDuration, setPlayerDuration] = useState(0)
  const [pendingResume, setPendingResume] = useState(null)
  const [courseJustCompleted, setCourseJustCompleted] = useState(false)
  const [contentOpen, setContentOpen] = useState(false)
  const watchStart = useRef(null)
  const videoRef = useRef(null)
  const videoCurrentTimeRef = useRef(0)
  const ytPlayerRef = useRef(null)
  const ytContainerRef = useRef(null)
  const persistTimer = useRef(null)
  const commentInputRef = useRef(null)

  const persistWatchTime = useCallback(seconds => {
    if (!currentLesson || currentLesson.is_completed) return
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      progressAPI.track(currentLesson.id, { watch_time_seconds: Math.round(seconds), is_completed: false }).catch(() => {})
    }, 8000)
  }, [currentLesson])

  const handlePlayerTimeUpdate = useCallback((currentTime, duration) => {
    videoCurrentTimeRef.current = currentTime
    if (duration > 0) {
      setPlayerDuration(duration)
      setWatchPct(Math.min(100, (currentTime / duration) * 100))
      persistWatchTime(currentTime)
    }
  }, [persistWatchTime])

  const handlePlayerLoadedMetadata = useCallback(duration => {
    if (duration && isFinite(duration)) setPlayerDuration(duration)
  }, [])

  const selectLesson = useCallback((lesson, reload = true) => {
    if (lesson?.locked || lesson?.section?.locked) return
    setCurrentLesson(lesson)
    setWatchPct(storedWatchPct(lesson))
    setPlayerDuration(0)
    videoCurrentTimeRef.current = lesson.watch_time_seconds || 0
    setPendingResume(lesson.watch_time_seconds > 5 ? lesson.watch_time_seconds : null)
    setCourseJustCompleted(false)
    watchStart.current = Date.now()
    commentAPI.list(lesson.id).then(r => setComments(r.data.data || [])).catch(() => {})
    funnelAPI.track({ type: 'lesson_start', course_id: courseId, lesson_id: lesson.id })
    if (reload) window.scrollTo(0, 0)
  }, [courseId])

  const load = async () => {
    setLoading(true)
    try {
      const r = await studentAPI.courseContent(courseId)
      const c = r.data.data
      setCourse(c)
      assignmentAPI.list(courseId).then(a => setAssignments(a.data.data || [])).catch(() => {})
      quizAPI.list(courseId).then(q => setQuizzes(q.data.data || [])).catch(() => {})
      const flat = unlockedLessons(c)
      const first = flat.find(l => !l.is_completed) || flat[0]
      if (first) selectLesson(first, false)
    } catch { toast.error('Could not load course.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [courseId])

  // YouTube player progress tracking
  useEffect(() => {
    if (currentLesson?.content_type !== 'youtube' || !currentLesson.youtube_url) return
    const videoId = getYouTubeId(currentLesson.youtube_url)
    if (!videoId) return

    let player = null
    let interval = null
    const resumeAt = pendingResume

    const initPlayer = () => {
      player = new window.YT.Player(ytContainerRef.current, {
        videoId,
        playerVars: { autoplay: 0, rel: 0, modestbranding: 1 },
        events: {
          onReady: e => {
            const dur = e.target.getDuration()
            if (dur) setPlayerDuration(dur)
            if (resumeAt > 5) e.target.seekTo(resumeAt, true)
          }
        }
      })
      ytPlayerRef.current = player
      interval = setInterval(() => {
        if (!player?.getCurrentTime) return
        const dur = player.getDuration()
        const cur = player.getCurrentTime()
        if (dur > 0) handlePlayerTimeUpdate(cur, dur)
      }, 1000)
    }

    const start = () => {
      if (window.YT?.Player) initPlayer()
      else {
        const prev = window.onYouTubeIframeAPIReady
        window.onYouTubeIframeAPIReady = () => { prev?.(); initPlayer() }
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script')
          tag.src = 'https://www.youtube.com/iframe_api'
          document.head.appendChild(tag)
        }
      }
    }
    start()

    return () => {
      clearInterval(interval)
      player?.destroy?.()
      ytPlayerRef.current = null
    }
  }, [currentLesson?.id, currentLesson?.content_type, currentLesson?.youtube_url, pendingResume, handlePlayerTimeUpdate])

  // Native video element listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video || currentLesson?.content_type !== 'video' || currentLesson?.mux_playback_id) return

    const onMeta = () => {
      handlePlayerLoadedMetadata(video.duration)
      if (pendingResume > 5 && video.duration && pendingResume < video.duration - 2) {
        video.currentTime = pendingResume
      }
    }
    const onTime = () => handlePlayerTimeUpdate(video.currentTime, video.duration)

    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('timeupdate', onTime)
    if (video.readyState >= 1) onMeta()

    return () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('timeupdate', onTime)
    }
  }, [currentLesson?.id, currentLesson?.content_type, currentLesson?.mux_playback_id, pendingResume, handlePlayerTimeUpdate, handlePlayerLoadedMetadata])

  const markComplete = async () => {
    if (!currentLesson || completing) return
    const flat = unlockedLessons(course)
    const idx = flat.findIndex(l => l.id === currentLesson.id)
    const nextId = flat[idx + 1]?.id
    const isLast = idx === flat.length - 1

    setCompleting(true)
    const durationSec = lessonDurationSeconds(currentLesson, playerDuration)
    const minRequired = durationSec > 0 ? Math.ceil(durationSec * (COMPLETION_MIN_WATCH_PCT / 100)) : 0
    const watchedPct = Math.max(watchPct, storedWatchPct(currentLesson))
    const watchSeconds = Math.max(
      Math.round(videoCurrentTimeRef.current),
      currentLesson.watch_time_seconds || 0,
      minRequired > 0 && watchedPct >= COMPLETION_MIN_WATCH_PCT ? minRequired : 0
    )
    try {
      const r = await progressAPI.track(currentLesson.id, {
        is_completed: true,
        watch_time_seconds: watchSeconds,
        duration_seconds: durationSec || undefined,
      })
      if (r.data.data.certificate_issued) {
        toast.success('🎓 Certificate earned! Course complete!')
      } else {
        toast.success('Lesson completed!')
      }
      const fresh = (await studentAPI.courseContent(courseId)).data.data
      setCourse(fresh)
      if (isLast) {
        setCourseJustCompleted(true)
        const updated = buildFlatLessons(fresh).find(l => l.id === currentLesson.id)
        if (updated) setCurrentLesson(updated)
      } else if (nextId) {
        const next = buildFlatLessons(fresh).find(l => l.id === nextId)
        if (next) selectLesson(next, false)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark complete')
    } finally { setCompleting(false) }
  }

  const postComment = async e => {
    e.preventDefault()
    if (!newComment.trim()) return
    setPostingComment(true)
    try {
      await commentAPI.create(currentLesson.id, { body: newComment })
      setNewComment('')
      commentAPI.list(currentLesson.id).then(r => setComments(r.data.data || [])).catch(() => {})
    } catch { toast.error('Failed to post comment') }
    finally { setPostingComment(false) }
  }

  const openAssignment = async assignment => {
    setAssignmentModal(assignment)
    setAssignmentForm({ submission_text: '', file: null })
    setMySubmission(null)
    setSubmissionLoading(true)
    try {
      const r = await assignmentAPI.mySubmission(assignment.id)
      if (r.data?.data) {
        setMySubmission(r.data.data)
        setAssignmentForm({ submission_text: r.data.data.submission_text || '', file: null })
      }
    } catch {}
    finally { setSubmissionLoading(false) }
  }

  const submitAssignment = async e => {
    e.preventDefault()
    if (!assignmentModal) return
    setSubmittingAssignment(true)
    try {
      const fd = new FormData()
      if (assignmentForm.submission_text?.trim()) fd.append('submission_text', assignmentForm.submission_text.trim())
      if (assignmentForm.file) fd.append('file', assignmentForm.file)
      await assignmentAPI.submit(assignmentModal.id, fd)
      toast.success('Assignment submitted!')
      const [listRes, myRes] = await Promise.all([
        assignmentAPI.list(courseId),
        assignmentAPI.mySubmission(assignmentModal.id)
      ])
      setAssignments(listRes.data.data || [])
      setMySubmission(myRes.data.data || null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit assignment')
    } finally {
      setSubmittingAssignment(false)
    }
  }

  const openQuiz = async quiz => {
    setQuizLoading(true)
    setSelectedQuiz(null)
    setQuizAnswers({})
    setQuizResults([])
    try {
      const [quizRes, resultsRes] = await Promise.all([
        quizAPI.get(quiz.id),
        quizAPI.results(quiz.id)
      ])
      setSelectedQuiz(quizRes.data.data)
      setQuizResults(resultsRes.data.data || [])
    } catch {
      toast.error('Failed to load quiz')
    } finally {
      setQuizLoading(false)
    }
  }

  const submitQuiz = async e => {
    e.preventDefault()
    if (!selectedQuiz) return
    setQuizSubmitting(true)
    try {
      const r = await quizAPI.submit(selectedQuiz.id, { answers: quizAnswers })
      toast.success(`Submitted! Score: ${r.data.data.percentage}%`)
      const resultsRes = await quizAPI.results(selectedQuiz.id)
      setQuizResults(resultsRes.data.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quiz')
    } finally {
      setQuizSubmitting(false)
    }
  }

  const resumePlayback = () => {
    if (!pendingResume) return
    const video = videoRef.current
    if (video) video.currentTime = pendingResume
    else if (ytPlayerRef.current?.seekTo) ytPlayerRef.current.seekTo(pendingResume, true)
    setPendingResume(null)
  }

  const startOver = () => {
    setPendingResume(null)
    const video = videoRef.current
    if (video) video.currentTime = 0
    else if (ytPlayerRef.current?.seekTo) ytPlayerRef.current.seekTo(0, true)
    setWatchPct(0)
    videoCurrentTimeRef.current = 0
  }

  if (loading) return <DashboardLayout title="Course Player"><LoadingScreen /></DashboardLayout>
  if (!course) return <DashboardLayout title="Error"><div className="alert alert-error">Course not found or access denied.</div></DashboardLayout>

  const available = unlockedLessons(course)
  const completedCount = available.filter(l => l.is_completed).length
  const progress = available.length ? Math.round((completedCount / available.length) * 100) : 0
  const currentIdx = available.findIndex(l => l.id === currentLesson?.id)
  const prevLesson = currentIdx > 0 ? available[currentIdx - 1] : null
  const nextLesson = currentIdx >= 0 && currentIdx < available.length - 1 ? available[currentIdx + 1] : null

  const isWatchGated = currentLesson && ['video', 'youtube'].includes(currentLesson.content_type)
  const effectiveWatchPct = Math.max(watchPct, storedWatchPct(currentLesson))
  const canMarkComplete = !isWatchGated || effectiveWatchPct >= COMPLETION_MIN_WATCH_PCT

  const footerDuration = playerDuration
    ? formatDuration(playerDuration)
    : (currentLesson?.mux_duration_seconds ? formatDuration(currentLesson.mux_duration_seconds) : null)
    || (currentLesson?.duration_minutes ? `${currentLesson.duration_minutes} min` : null)

  const renderLessonList = () => (
    <div className="lesson-list" style={{ borderRadius: 14 }}>
      <div className="lesson-list-header">Course Content</div>
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {(course.sections || []).map(sec => (
          <div key={sec.id} className="section-group">
            <div className={`section-group-header${sec.locked ? ' locked' : ''}`}>
              {sec.locked && <Lock size={11} style={{ display: 'inline', marginRight: 6, verticalAlign: -1 }} />}
              {sec.title}
              {sec.locked && (
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8, fontSize: 10 }}>
                  {sec.unlocks_in_days != null
                    ? `Unlocks in ${sec.unlocks_in_days} days`
                    : sec.unlock_date
                      ? `Unlocks ${new Date(sec.unlock_date).toLocaleDateString()}`
                      : 'Locked'}
                </span>
              )}
            </div>
            {(sec.lessons || []).map(lesson => {
              const isLocked = lesson.locked || sec.locked
              const unlockLabel = sec.unlocks_in_days != null
                ? `Unlocks in ${sec.unlocks_in_days} days`
                : sec.unlock_date
                  ? `Unlocks ${new Date(sec.unlock_date).toLocaleDateString()}`
                  : 'Locked'
              return (
                <div
                  key={lesson.id}
                  className={`lesson-item${currentLesson?.id === lesson.id ? ' active' : ''}${lesson.is_completed ? ' completed' : ''}${isLocked ? ' locked' : ''}`}
                  onClick={() => !isLocked && selectLesson({ ...lesson, section: sec })}
                  title={isLocked ? unlockLabel : undefined}
                >
                  <div className={`lesson-check${lesson.is_completed ? ' done' : ''}`}>
                    {lesson.is_completed ? <CheckCircle size={12} /> : isLocked ? <Lock size={10} /> : null}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
                    {isLocked && (
                      <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2 }}>{unlockLabel}</div>
                    )}
                  </div>
                  {lessonListDuration(lesson) && (
                    <span className="lesson-duration">{lessonListDuration(lesson)}</span>
                  )}
                  <LessonIcon type={lesson.content_type} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <DashboardLayout title={course.title}>
      <Link to="/student/courses" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'inline-block', marginBottom: 12 }}>← My Courses</Link>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>{course.title}</h1>
        {course.teacher_name && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Instructor: {course.teacher_name}</div>
        )}
      </div>

      <div className="course-player-layout">
        <div>
          <div className="tabs" style={{ marginBottom: 16 }}>
            {[
              ['lesson', `Lesson`],
              ['assignments', `Assignments (${assignments.length})`],
              ['quizzes', `Quizzes (${quizzes.length})`],
              ['discussion', `Discussion (${comments.length})`]
            ].map(([key, label]) => (
              <button
                key={key}
                className={`tab-btn${activeTab === key ? ' active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'lesson' && (
            <>
              <div className="video-player-wrap" style={{ marginBottom: 20 }}>
                {!currentLesson && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: 12 }}>
                    <Play size={48} opacity={0.3} /><span style={{ opacity: 0.5 }}>Select a lesson</span>
                  </div>
                )}

                {currentLesson && pendingResume && (
                  <div className="resume-banner" style={{ position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 4 }}>
                    <span>Resume from {formatDuration(pendingResume)}?</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={resumePlayback}>Resume</button>
                      <button className="btn btn-ghost btn-sm" onClick={startOver}>Start over</button>
                    </div>
                  </div>
                )}

                {currentLesson?.content_type === 'youtube' && currentLesson.youtube_url && (
                  <div ref={ytContainerRef} style={{ width: '100%', height: '100%' }} />
                )}
                {currentLesson?.content_type === 'video' && !currentLesson.mux_playback_id && currentLesson.video_url && (
                  <video ref={videoRef} controls src={currentLesson.video_url} />
                )}
                {currentLesson?.content_type === 'video' && currentLesson.mux_playback_id && (
                  <HlsVideoPlayer
                    src={`https://stream.mux.com/${currentLesson.mux_playback_id}.m3u8`}
                    initialTime={pendingResume || 0}
                    onTimeUpdate={handlePlayerTimeUpdate}
                    onLoadedMetadata={handlePlayerLoadedMetadata}
                  />
                )}
                {currentLesson?.content_type === 'video' && !currentLesson.mux_playback_id && !currentLesson.video_url && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: 12 }}>
                    <Play size={42} opacity={0.3} />
                    <span style={{ opacity: 0.6 }}>
                      {currentLesson.mux_status === 'failed'
                        ? 'Video processing failed. Please contact your teacher.'
                        : 'Video is processing. Please check back soon.'}
                    </span>
                  </div>
                )}
                {currentLesson?.content_type === 'pdf' && currentLesson.pdf_url && (
                  <iframe src={currentLesson.pdf_url} title={currentLesson.title} />
                )}
                {currentLesson?.content_type === 'text' && (
                  <div style={{ background: '#1a1a2e', color: '#fff', padding: 32, height: '100%', overflowY: 'auto', fontSize: 15, lineHeight: 1.8 }}>
                    <h3 style={{ color: '#fff', marginBottom: 16 }}>{currentLesson.title}</h3>
                    <p>{currentLesson.text_content}</p>
                  </div>
                )}
              </div>

              {/* Mobile course content accordion */}
              <div className="course-content-accordion">
                <button
                  type="button"
                  className={`course-content-accordion-toggle${contentOpen ? ' open' : ''}`}
                  onClick={() => setContentOpen(o => !o)}
                >
                  <span>Course Content ({completedCount}/{available.length})</span>
                  <ChevronDown size={18} />
                </button>
                {contentOpen && renderLessonList()}
              </div>

              {currentLesson && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <h2 style={{ fontSize: 20, marginBottom: 6 }}>{currentLesson.title}</h2>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {currentLesson.content_type}
                          {currentLesson.content_type === 'video' && currentLesson.mux_status && currentLesson.mux_status !== 'ready'
                            ? ` (${currentLesson.mux_status})`
                            : ''}
                          {footerDuration && <> · {footerDuration}</>}
                        </span>
                      </div>
                      <div className="lesson-footer-actions">
                        {prevLesson && (
                          <button className="btn btn-ghost btn-sm" onClick={() => selectLesson(prevLesson)}>
                            <ChevronLeft size={16} /> Previous
                          </button>
                        )}
                        {currentLesson.is_completed ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>
                            <CheckCircle size={20} /> Completed
                          </div>
                        ) : (
                          <button
                            className="btn btn-primary"
                            onClick={markComplete}
                            disabled={completing || !canMarkComplete}
                            title={!canMarkComplete ? `Watch at least ${COMPLETION_MIN_WATCH_PCT}% to complete` : undefined}
                          >
                            {completing ? <Spinner size={16} /> : (
                              <>
                                <CheckCircle size={15} />
                                {canMarkComplete ? 'Mark Complete' : `Watch ${COMPLETION_MIN_WATCH_PCT}% to complete`}
                                {!canMarkComplete && isWatchGated && (
                                  <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 4 }}>({Math.floor(effectiveWatchPct)}%)</span>
                                )}
                              </>
                            )}
                          </button>
                        )}
                        {nextLesson ? (
                          <button className="btn btn-secondary btn-sm" onClick={() => selectLesson(nextLesson)}>
                            Next: {nextLesson.title.length > 24 ? `${nextLesson.title.slice(0, 24)}…` : nextLesson.title} <ChevronRight size={16} />
                          </button>
                        ) : !currentLesson.is_completed ? null : (
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Last lesson</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Course Progress</span>
                        <span style={{ fontWeight: 600 }}>{completedCount}/{available.length} lessons ({progress}%)</span>
                      </div>
                      <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
                    </div>

                    {courseJustCompleted && (
                      <div className="course-complete-banner">
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Course complete!</div>
                        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>You've finished all available lessons. Great work!</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'assignments' && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-body">
                <h3 style={{ fontSize: 16, marginBottom: 14 }}>Assignments ({assignments.length})</h3>
                {assignments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No assignments yet for this course.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {assignments.map(a => (
                      <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Due: {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No due date'} • Max grade: {a.max_grade}
                          </div>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => openAssignment(a)}>Open</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-body">
                <h3 style={{ fontSize: 16, marginBottom: 14 }}>Quizzes ({quizzes.length})</h3>
                {quizzes.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No quizzes yet for this course.</p>
                ) : (
                  <>
                    {!selectedQuiz && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                        {quizzes.map(q => (
                          <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>{q.title}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Pass: {q.pass_score}% • Attempts: {q.max_attempts}
                              </div>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={() => openQuiz(q)}>Open Quiz</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {quizLoading && <Spinner size={18} />}

                    {selectedQuiz && !quizLoading && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                          <h4 style={{ margin: 0, fontSize: 17 }}>{selectedQuiz.title}</h4>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedQuiz(null); setQuizAnswers({}) }}>Back to quizzes</button>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                          Pass score: {selectedQuiz.pass_score}% • Max attempts: {selectedQuiz.max_attempts}
                        </div>

                        <form onSubmit={submitQuiz}>
                          {(selectedQuiz.questions || []).map((q, i) => {
                            const options = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || [])
                            return (
                              <div key={q.id} style={{ border: '1px solid var(--border-soft)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                                <div style={{ fontWeight: 600, marginBottom: 8 }}>Q{i + 1}. {q.question}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {options.map((opt, oi) => (
                                    <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                                      <input
                                        type="radio"
                                        name={`q-${q.id}`}
                                        value={opt}
                                        checked={quizAnswers[q.id] === opt}
                                        onChange={e => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                          <button type="submit" className="btn btn-primary" disabled={quizSubmitting}>
                            {quizSubmitting ? <Spinner size={16} /> : 'Submit Quiz'}
                          </button>
                        </form>

                        {quizResults.length > 0 && (
                          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>My Attempts</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {quizResults.map(r => (
                                <div key={r.id} style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                  Attempt #{r.attempt_number}: <strong style={{ color: 'var(--text)' }}>{r.percentage}%</strong> ({r.score}/{r.total_points}) - {r.passed ? 'Passed' : 'Failed'}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {currentLesson && activeTab === 'discussion' && (
            <div className="card">
              <div className="card-body">
                <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageCircle size={18} /> Discussion ({comments.length})
                </h3>
                <form onSubmit={postComment} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <input
                    ref={commentInputRef}
                    className="form-control"
                    placeholder="Ask a question or share a thought..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={postingComment}>
                    {postingComment ? <Spinner size={14} /> : <Send size={14} />}
                  </button>
                </form>
                {comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--bg-glass)', borderRadius: 10, border: '1px dashed var(--border)' }}>
                    <MessageCircle size={32} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 14 }}>Stuck on this lesson? Ask your instructor for help.</p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => commentInputRef.current?.focus()}
                    >
                      Ask your instructor
                    </button>
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{c.author_name?.charAt(0)}</div>
                      <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{c.author_name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.author_role}</span>
                          {c.is_pinned && <span className="badge badge-accent" style={{ fontSize: 10 }}>📌 Pinned</span>}
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{c.body}</p>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="course-player-sidebar">
          <div style={{ position: 'sticky', top: 80 }}>
            {renderLessonList()}
          </div>
        </div>
      </div>

      <Modal
        open={!!assignmentModal}
        onClose={() => setAssignmentModal(null)}
        title={`Assignment — ${assignmentModal?.title || ''}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAssignmentModal(null)}>Close</button>
          <button className="btn btn-secondary" onClick={submitAssignment} disabled={submittingAssignment}>
            {submittingAssignment ? <Spinner size={14} /> : 'Submit Assignment'}
          </button>
        </>}
      >
        {assignmentModal && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
              {assignmentModal.description || 'No assignment description provided.'}
            </p>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant="muted">Max: {assignmentModal.max_grade}</Badge>
              <Badge variant="muted">Due: {assignmentModal.due_date ? new Date(assignmentModal.due_date).toLocaleDateString() : 'No due date'}</Badge>
            </div>

            {submissionLoading ? (
              <Spinner size={18} />
            ) : mySubmission ? (
              <div className="alert alert-info" style={{ marginBottom: 12 }}>
                Submitted: {new Date(mySubmission.submitted_at).toLocaleString()}
                {mySubmission.grade != null ? ` • Grade: ${mySubmission.grade}/${mySubmission.max_grade}` : ' • Not graded yet'}
              </div>
            ) : null}

            <form onSubmit={submitAssignment}>
              <div className="form-group">
                <label className="form-label">Submission Text</label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={assignmentForm.submission_text}
                  onChange={e => setAssignmentForm(prev => ({ ...prev, submission_text: e.target.value }))}
                  placeholder="Write your answer or notes..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Attach File (optional)</label>
                <input
                  className="form-control"
                  type="file"
                  onChange={e => setAssignmentForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                />
              </div>
            </form>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
