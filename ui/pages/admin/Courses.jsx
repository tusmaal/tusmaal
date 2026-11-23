import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Spinner, Badge, ConfirmModal } from '../../components/common/index.jsx'
import { courseAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { BookOpen, Search, Eye, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    courseAPI.list({ search, limit: 100 }).then(r => setCourses(r.data.data || [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search])

  const togglePublish = async c => {
    try {
      await courseAPI.update(c.id, JSON.stringify({ is_published: !c.is_published }))
      toast.success(c.is_published ? 'Unpublished' : 'Published!')
      load()
    } catch { toast.error('Failed') }
  }

  const del = async () => {
    setSaving(true)
    try { await courseAPI.delete(deleting.id); toast.success('Course deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <DashboardLayout title="All Courses">
      <div className="page-header"><h1>All Courses</h1></div>

      <div className="search-bar" style={{ maxWidth: 360, marginBottom: 20 }}>
        <Search size={16}/>
        <input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Course</th><th>Teacher</th><th>Category</th><th>Students</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign:'center', padding:40 }}><Spinner/></td></tr>
                : courses.length === 0 ? <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No courses found.</td></tr>
                : courses.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:44, height:32, borderRadius:6, overflow:'hidden', flexShrink:0, background:'var(--border-soft)' }}>
                          {c.thumbnail ? <img src={c.thumbnail} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--primary)' }}><BookOpen size={14} color="rgba(255,255,255,0.5)"/></div>}
                        </div>
                        <div>
                          <div style={{ fontWeight:500, fontSize:13 }}>{c.title}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' }}>{c.level}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:13, color:'var(--text-muted)' }}>{c.teacher_name || '—'}</td>
                    <td style={{ fontSize:13 }}>{c.category || '—'}</td>
                    <td style={{ fontWeight:600 }}>{c.total_students || 0}</td>
                    <td style={{ color:'var(--accent)', fontWeight:600 }}>${c.price}</td>
                    <td><Badge variant={c.is_published ? 'success' : 'muted'}>{c.is_published ? 'Published' : 'Draft'}</Badge></td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <Link to={`/courses/${c.slug}`} target="_blank" className="btn btn-ghost btn-sm"><Eye size={13}/></Link>
                        <button className="btn btn-sm" style={{ background: c.is_published ? '#fef3c7' : '#dcfce7', color: c.is_published ? 'var(--warning)' : 'var(--success)', fontSize:12 }} onClick={() => togglePublish(c)}>
                          {c.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => setDeleting(c)}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving} title="Delete Course" message={`Permanently delete "${deleting?.title}"? This will also remove all sections, lessons, and student progress.`}/>
    </DashboardLayout>
  )
}
