import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from '../components/common/LoadingSpinner'

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <PageLoader />
  if (isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Email and password are required')
      return
    }
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      toast.success('Welcome to Zar-E-Fishan')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Zar-E-Fishan</h1>
        <p className="tagline">Interior Design Management ERP</p>
        <div className="form-group" style={{ marginBottom: '0.9rem' }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@zarefishan.com"
          />
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? (
            'Signing in…'
          ) : (
            <>
              <LogIn size={18} /> Sign in
            </>
          )}
        </button>
        <p
          style={{
            marginTop: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            borderLeft: '3px solid var(--gold)',
            padding: '0.65rem',
            background: 'rgba(197,166,117,0.12)',
            borderRadius: 8,
          }}
        >
          <strong style={{ color: 'var(--olive)' }}>Demo:</strong> admin@zarefishan.com / admin123
        </p>
      </form>
    </div>
  )
}