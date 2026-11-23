import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout.jsx'
import { Modal, ConfirmModal, Spinner, Badge, EmptyState } from '../../components/common/index.jsx'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { UserPlus, Search, RefreshCw, Ban, Eye, KeyRound, CheckCircle } from 'lucide-react'

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = searchParams.get('role') || 'student'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const [resetModal, setResetModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const defaultRole = role === 'teacher' ? 'teacher' : 'student'
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: defaultRole, phone: '' })
  const [resetPw, setResetPw] = useState('')

  const load = () => {
    setLoading(true)
    adminAPI.getUsers({ role, search }).then(r => setUsers(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [role, search])

  // Auto-open the create modal when arriving via "Add Student" (?new=1).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowCreate(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleCreate = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await adminAPI.createUser(form)
      toast.success('Account created!')
      setShowCreate(false)
      setForm({ full_name: '', email: '', password: '', role: defaultRole, phone: '' })
      load()
    } catch (err) {
      const apiError = err.response?.data
      const detail = apiError?.errors?.[0]?.message
      toast.error(detail || apiError?.message || 'Failed')
    }
    finally { setSaving(false) }
  }

  const handleDeactivate = async () => {
    setSaving(true)
    try {
      await adminAPI.deactivateUser(confirmDeactivate.id)
      toast.success('User deactivated')
      setConfirmDeactivate(null)
      load()
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleApprove = async (u) => {
    setSaving(true)
    try {
      await adminAPI.updateUser(u.id, { is_approved: true })
      toast.success(`${u.full_name} approved — dashboard unlocked`)
      load()
    } catch { toast.error('Failed to approve') }
    finally { setSaving(false) }
  }

  const handleResetPassword = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await adminAPI.resetPassword(resetModal.id, { new_password: resetPw })
      toast.success('Password reset!')
      setResetModal(null); setResetPw('')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <DashboardLayout title="Users">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage student and teacher accounts</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({ full_name: '', email: '', password: '', role: defaultRole, phone: '' })
            setShowCreate(true)
          }}
        >
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {/* Role tabs */}
      <div className="tabs">
        {['student', 'teacher', 'admin'].map(r => (
          <button key={r} className={`tab-btn${role === r ? ' active' : ''}`}
            onClick={() => setSearchParams({ role: r })} style={{ textTransform: 'capitalize' }}>{r}s</button>
        ))}
      </div>

      {/* Search */}
      <div className="search-bar" style={{ maxWidth: 380, marginBottom: 20 }}>
        <Search size={16} />
        <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Status</th>{role === 'student' && <th>Access</th>}<th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><Spinner /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{u.full_name?.charAt(0)}</div>
                      <span style={{ fontWeight: 500 }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.phone || '—'}</td>
                  <td><Badge variant={u.is_active ? 'success' : 'danger'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  {role === 'student' && (
                    <td><Badge variant={u.is_approved ? 'success' : 'warning'}>{u.is_approved ? 'Approved' : 'Subscriber'}</Badge></td>
                  )}
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {role === 'student' && !u.is_approved && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleApprove(u)} disabled={saving} title="Approve & unlock dashboard"><CheckCircle size={14} /> Approve</button>
                      )}
                      <Link to={`/admin/users/${u.id}`} className="btn btn-ghost btn-sm"><Eye size={14} /></Link>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setResetModal(u); setResetPw('') }} title="Reset password"><KeyRound size={14} /></button>
                      {u.is_active && role !== 'admin' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDeactivate(u)} style={{ color: 'var(--danger)' }} title="Deactivate"><Ban size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create User Account"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? <Spinner size={16} /> : 'Create Account'}</button>
        </>}>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          {[['full_name','Full Name','text'],['email','Email','email'],['password','Password','password'],['phone','Phone (optional)','tel']].map(([k,l,t]) => (
            <div className="form-group" key={k}>
              <label className="form-label">{l}</label>
              <input
                className="form-control"
                type={t}
                required={k !== 'phone'}
                minLength={k === 'password' ? 8 : undefined}
                placeholder={k === 'password' ? 'Minimum 8 characters' : undefined}
                value={form[k]}
                onChange={e => setForm({ ...form, [k]: e.target.value })}
              />
            </div>
          ))}
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal open={!!resetModal} onClose={() => setResetModal(null)} title={`Reset Password — ${resetModal?.full_name}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setResetModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleResetPassword} disabled={saving}>{saving ? <Spinner size={16} /> : 'Reset'}</button>
        </>}>
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-control" type="password" required minLength={8} value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="Min. 8 characters" />
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!confirmDeactivate} onClose={() => setConfirmDeactivate(null)}
        onConfirm={handleDeactivate} loading={saving} title="Deactivate User"
        message={`Are you sure you want to deactivate ${confirmDeactivate?.full_name}? They will lose access immediately.`} />
    </DashboardLayout>
  )
}
