import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, User, Bell } from 'lucide-react'
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
      <div className="topbar-left">
        <button type="button" className="menu-toggle" onClick={onMenu} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <div>
          <p className="topbar-kicker">Zar-E-Fishan</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="topbar-right">
        <button
          type="button"
          className="icon-btn"
          title="Pending payments"
          onClick={() => navigate('/finance/pending')}
        >
          <Bell size={18} />
        </button>
        <div className="user-chip">
          <div className="user-avatar">
            <User size={16} />
          </div>
          <div className="user-meta">
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  )
}
