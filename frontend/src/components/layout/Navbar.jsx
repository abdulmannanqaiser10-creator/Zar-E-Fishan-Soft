import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar({ title, onMenu }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button type="button" className="menu-toggle" onClick={onMenu} aria-label="Menu">
          <Menu size={22} />
        </button>
        <h2>{title}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600, color: 'var(--olive)', fontSize: '0.9rem' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {user?.role}
          </div>
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(197,166,117,0.25)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--olive)',
          }}
        >
          <User size={18} />
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  )
}