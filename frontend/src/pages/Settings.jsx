import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { settingsAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    settingsAPI.get()
      .then((res) => setSettings(res.data.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
    setProfile({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  }, [user]);

  useEffect(() => {
    if (tab === 'users' && (user?.role === 'admin' || user?.role === 'manager')) {
      authAPI.users().then((res) => setUsers(res.data.data)).catch(() => {});
    }
  }, [tab, user]);

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsAPI.update({
        ...settings,
        taxRate: Number(settings.taxRate) || 0,
      });
      setSettings(res.data.data);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(profile);
      updateUser(res.data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const digitsOnly = (value, max = 8) => value.replace(/\D/g, '').slice(0, max);

  const changePin = async (e) => {
    e.preventDefault();
    const currentPin = digitsOnly(pinForm.currentPin);
    const newPin = digitsOnly(pinForm.newPin);
    const confirmPin = digitsOnly(pinForm.confirmPin);
    if (newPin !== confirmPin) {
      return toast.error('New PIN and confirmation do not match');
    }
    if (newPin.length < 4 || newPin.length > 8) {
      return toast.error('PIN must be 4–8 digits');
    }
    if (currentPin.length < 4) {
      return toast.error('Enter your current PIN');
    }
    setSaving(true);
    try {
      await authAPI.changePin({ currentPin, newPin });
      toast.success('PIN changed');
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'PIN change failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Company, invoice and account preferences" />
      <div className="tabs">
        {['company', 'invoice', 'profile', 'pin', ...(user?.role === 'admin' || user?.role === 'manager' ? ['users'] : [])].map((t) => (
          <button key={t} type="button" className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'pin' ? 'Change PIN' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {(tab === 'company' || tab === 'invoice') && (
        <form className="card" onSubmit={saveSettings}>
          {tab === 'company' ? (
            <div className="form-grid">
              <div className="form-group"><label>Company Name</label>
                <input value={settings.companyName || ''} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
              </div>
              <div className="form-group"><label>Email</label>
                <input value={settings.email || ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
              </div>
              <div className="form-group"><label>Phone</label>
                <input value={settings.phone || ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              </div>
              <div className="form-group"><label>Website</label>
                <input value={settings.website || ''} onChange={(e) => setSettings({ ...settings, website: e.target.value })} />
              </div>
              <div className="form-group full"><label>Logo URL</label>
                <input
                  type="url"
                  placeholder="https://…"
                  value={settings.logo || ''}
                  onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                />
              </div>
              <div className="form-group full"><label>Address</label>
                <textarea rows={2} value={settings.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
              </div>
              <div className="form-group"><label>Currency</label>
                <input value={settings.currency || ''} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
              </div>
              <div className="form-group"><label>Currency Symbol</label>
                <input value={settings.currencySymbol || ''} onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })} />
              </div>
              <div className="form-group"><label>Default Tax Rate %</label>
                <input type="number" min="0" value={settings.taxRate ?? 0} onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })} />
              </div>
              <div className="form-group"><label>Tax Label</label>
                <input value={settings.taxLabel || ''} onChange={(e) => setSettings({ ...settings, taxLabel: e.target.value })} />
              </div>
              <div className="form-group"><label>Low Stock Alerts</label>
                <select value={settings.lowStockAlert ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, lowStockAlert: e.target.value === 'true' })}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="form-group"><label>Invoice Prefix</label>
                <input value={settings.invoicePrefix || ''} onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })} />
              </div>
              <div className="form-group"><label>PO Prefix</label>
                <input value={settings.poPrefix || ''} onChange={(e) => setSettings({ ...settings, poPrefix: e.target.value })} />
              </div>
              <div className="form-group"><label>Project Prefix</label>
                <input value={settings.projectPrefix || ''} onChange={(e) => setSettings({ ...settings, projectPrefix: e.target.value })} />
              </div>
              <div className="form-group full"><label>Invoice Footer</label>
                <textarea rows={3} value={settings.invoiceFooter || ''} onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })} />
              </div>
            </div>
          )}
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
          </div>
        </form>
      )}

      {tab === 'profile' && (
        <form className="card form-grid" onSubmit={saveProfile}>
          <div className="form-group"><label>Name</label>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div className="form-group"><label>Email</label>
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div className="form-group"><label>Phone</label>
            <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <div className="form-group full" style={{ textAlign: 'right' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update Profile'}</button>
          </div>
        </form>
      )}

      {tab === 'pin' && (
        <form className="card form-grid" onSubmit={changePin}>
          <div className="form-group"><label>Current PIN</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pinForm.currentPin}
              onChange={(e) => setPinForm({ ...pinForm, currentPin: digitsOnly(e.target.value) })}
            />
          </div>
          <div className="form-group"><label>New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pinForm.newPin}
              onChange={(e) => setPinForm({ ...pinForm, newPin: digitsOnly(e.target.value) })}
            />
          </div>
          <div className="form-group"><label>Confirm New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pinForm.confirmPin}
              onChange={(e) => setPinForm({ ...pinForm, confirmPin: digitsOnly(e.target.value) })}
            />
          </div>
          <p className="form-group full" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            PIN must be 4–8 digits.
          </p>
          <div className="form-group full" style={{ textAlign: 'right' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Change PIN'}</button>
          </div>
        </form>
      )}

      {tab === 'users' && (
        <div className="card">
          <h3 className="section-title">Users & Roles</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                    <td>{u.isActive ? 'Active' : 'Inactive'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Roles: admin, manager, accountant, staff. Backup preference is stored under company settings.
          </p>
        </div>
      )}
    </div>
  );
}
