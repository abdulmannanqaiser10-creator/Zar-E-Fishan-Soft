import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, ShieldCheck } from 'lucide-react';
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
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: '0.75rem' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'linear-gradient(145deg, #C5A675, #E2C89A)',
              color: '#252B1F',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.2rem',
            }}
          >
            ZE
          </div>
        </div>
        <h1>Zar-E-Fishan</h1>
        <p className="tagline">Interior Design Management ERP</p>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="pin">Secure PIN</label>
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
            style={{ letterSpacing: '0.4em', fontSize: '1.4rem', textAlign: 'center' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? 'Signing in…' : (<><KeyRound size={18} /> Unlock Workspace</>)}
        </button>
        <p
          style={{
            marginTop: '1rem',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            borderLeft: '3px solid var(--gold)',
            padding: '0.7rem 0.8rem',
            background: 'rgba(197,166,117,0.12)',
            borderRadius: 10,
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldCheck size={15} color="var(--olive)" />
          <span><strong style={{ color: 'var(--olive)' }}>Demo PIN:</strong> 1234</span>
        </p>
      </form>
    </div>
  );
}
