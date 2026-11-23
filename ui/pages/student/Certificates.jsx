import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { LoadingScreen, EmptyState } from '../../components/common/index.jsx'
import { studentAPI, certificateAPI } from '../../services/api'
import { Award, Download, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Certificates() {
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    studentAPI.certificates().then(r => setCerts(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  const download = async (cert) => {
    setDownloading(cert.id)
    try {
      const r = await certificateAPI.download(cert.id)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${cert.certificate_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed. Try again.')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <DashboardLayout title="Certificates"><LoadingScreen /></DashboardLayout>

  return (
    <DashboardLayout title="My Certificates">
      <div className="page-header">
        <div>
          <h1>My Certificates</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Download your earned certificates</p>
        </div>
      </div>

      {certs.length === 0 ? (
        <EmptyState icon={<Award size={48}/>} title="No certificates yet"
          description="Complete a course to earn your certificate automatically."
          action={<a href="/student/courses" className="btn btn-primary">Go to My Courses</a>} />
      ) : (
        <div className="grid-3">
          {certs.map(cert => (
            <div key={cert.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Certificate preview header */}
              <div style={{ background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', padding: '28px 24px', textAlign: 'center', position: 'relative' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(200,149,42,0.2)', border: '2px solid rgba(200,149,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Award size={28} color="var(--accent-light)" />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Certificate of Completion</div>
                <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{cert.course_title}</div>
              </div>

              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Certificate No.</div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace', fontSize: 12 }}>{cert.certificate_number}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Issued</div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>

                {cert.teacher_name && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Instructor: <strong style={{ color: 'var(--text)' }}>{cert.teacher_name}</strong>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => download(cert)}
                  disabled={downloading === cert.id}
                >
                  {downloading === cert.id
                    ? <><span className="spinner" style={{ width: 16, height: 16 }}/> Generating...</>
                    : <><Download size={15}/> Download PDF</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
