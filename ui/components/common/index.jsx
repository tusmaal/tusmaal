import { X, BookOpen } from 'lucide-react'

export function Spinner({ size = 32 }) {
  return <div className="spinner" style={{ width: size, height: size }} />
}

export function LoadingScreen({ text = 'Loading...' }) {
  return (
    <div className="loading-screen">
      <Spinner />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{text}</p>
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Avatar({ user, size = 36 }) {
  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  if (user?.profile_photo) {
    return <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}><img src={user.profile_photo} alt={user.full_name} /></div>
  }
  return <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</div>
}

export function Badge({ children, variant = 'muted' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon || <BookOpen size={48} />}
      <h3>{title}</h3>
      {description && <p style={{ fontSize: 14, marginBottom: 20 }}>{description}</p>}
      {action}
    </div>
  )
}

export function ProgressBar({ value, max = 100 }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="progress-bar">
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function StatCard({ icon, label, value, color = '#1a3a5c', bg = '#dbeafe' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg, color }}>
        {icon}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

export function Alert({ type = 'info', children }) {
  return <div className={`alert alert-${type}`}>{children}</div>
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Confirm'}
        </button>
      </>}>
      <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{message}</p>
    </Modal>
  )
}
