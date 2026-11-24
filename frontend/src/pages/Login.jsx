import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/common/LoadingSpinner';

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) {
      toast.error('Enter a 4–8 digit PIN');
      return;
    }
    setSubmitting(true);
    try {
      await login(pin);
      toast.success('Welcome to Zar-E-Fishan');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invalid PIN');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Zar-E-Fishan</h1>
        <p className="tagline">Interior Design Management ERP</p>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="pin">PIN Code</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            autoComplete="one-time-code"
            placeholder="••••"
            style={{ letterSpacing: '0.35em', fontSize: '1.35rem', textAlign: 'center' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? 'Signing in…' : (<><KeyRound size={18} /> Unlock with PIN</>)}
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
          <strong style={{ color: 'var(--olive)' }}>Demo PIN:</strong> 1234
        </p>
      </form>
    </div>
  );
}
