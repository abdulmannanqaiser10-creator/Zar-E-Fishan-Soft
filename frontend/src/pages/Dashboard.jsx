import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CircleDollarSign,
  ArrowRight,
  FileText,
  Contact,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { dashboardAPI } from '../api';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/format';

const PIE_COLORS = ['#3A4330', '#C5A675', '#556046', '#9E7F4A', '#7A8668'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI
      .get()
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;
  if (!data) return null;

  const {
    stats,
    monthlyChart,
    projectStatusOverview,
    recentProjects,
    recentTransactions,
    recentActivities,
    lowStockAlerts,
  } = data;

  return (
    <div className="dashboard-page">
      <section className="dash-hero">
        <div className="dash-hero-bg" aria-hidden />
        <div className="dash-hero-content">
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '0.72rem', opacity: 0.85, marginBottom: 8 }}>
              Interior Design Operations
            </p>
            <h1>Welcome back to Zar-E-Fishan</h1>
            <p>Track projects, cash flow, CRM pipeline and operations from one clean workspace.</p>
          </div>
          <div className="dash-hero-actions">
            <Link to="/projects" className="btn btn-gold">
              Projects <ArrowRight size={16} />
            </Link>
            <Link to="/finance/invoices" className="btn btn-outline" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.28)' }}>
              <FileText size={16} /> Invoices
            </Link>
            <Link to="/crm" className="btn btn-outline" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.28)' }}>
              <Contact size={16} /> CRM
            </Link>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard label="Total Projects" value={stats.totalProjects} icon={Briefcase} />
        <StatCard label="Active Projects" value={stats.activeProjects} icon={Briefcase} />
        <StatCard label="Completed" value={stats.completedProjects} icon={Briefcase} />
        <StatCard label="Clients" value={stats.totalClients} icon={Users} />
        <StatCard label="Revenue" value={formatCurrency(stats.revenue)} icon={TrendingUp} />
        <StatCard label="Expenses" value={formatCurrency(stats.expenses)} icon={TrendingDown} />
        <StatCard label="Profit" value={formatCurrency(stats.profit)} icon={CircleDollarSign} />
        <StatCard label="Pending Payments" value={formatCurrency(stats.pendingPayments)} icon={Wallet} />
      </div>

      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Cash Performance</h3>
            <Link to="/reports?type=cashFlow" style={{ fontSize: '0.82rem', color: 'var(--gold-dark)', fontWeight: 650 }}>
              Open cash flow →
            </Link>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={monthlyChart}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3A4330" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3A4330" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C5A675" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#C5A675" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4dcc8" />
                <XAxis dataKey="label" tick={{ fill: '#6b7260', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7260', fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3A4330" fill="url(#revFill)" strokeWidth={2.2} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#C5A675" fill="url(#expFill)" strokeWidth={2.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Project Mix</h3>
            <Link to="/reports?type=profitLoss" style={{ fontSize: '0.82rem', color: 'var(--gold-dark)', fontWeight: 650 }}>
              P&L report →
            </Link>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={projectStatusOverview}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={98}
                  paddingAngle={3}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {projectStatusOverview.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-title">Monthly Bars</h3>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4dcc8" />
              <XAxis dataKey="label" tick={{ fill: '#6b7260', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7260', fontSize: 12 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#3A4330" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#C5A675" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Recent Projects</h3>
            <Link to="/projects" style={{ fontSize: '0.8rem', color: 'var(--gold-dark)' }}>View all</Link>
          </div>
          {recentProjects?.length ? (
            recentProjects.map((p) => (
              <Link key={p._id} to={`/projects/${p._id}`} className="dash-list-item">
                <div>
                  <strong style={{ color: 'var(--olive)' }}>{p.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {p.client?.name} · {p.projectId}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No projects yet</p>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Recent Transactions</h3>
            <Link to="/finance" style={{ fontSize: '0.8rem', color: 'var(--gold-dark)' }}>Finance</Link>
          </div>
          {recentTransactions?.length ? (
            recentTransactions.map((t) => (
              <div key={t._id} className="dash-list-item">
                <div>
                  <strong style={{ color: 'var(--olive)' }}>{t.category}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatDate(t.date)} · {t.transactionId}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </div>
                  <StatusBadge status={t.type} />
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No transactions yet</p>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Activities & Alerts</h3>
            <Link to="/finance/pending" style={{ fontSize: '0.8rem', color: 'var(--gold-dark)' }}>Pending</Link>
          </div>
          {lowStockAlerts?.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              {lowStockAlerts.map((m) => (
                <div
                  key={m._id}
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.55rem 0.65rem',
                    marginBottom: '0.4rem',
                    borderRadius: 10,
                    background: 'rgba(196,154,60,0.12)',
                    color: '#8a6a1f',
                    fontSize: '0.84rem',
                  }}
                >
                  <AlertTriangle size={14} />
                  Low stock: {m.name} ({m.quantity} {m.unit})
                </div>
              ))}
            </div>
          )}
          {recentActivities?.length ? (
            recentActivities.map((a) => (
              <div key={a._id} className="dash-list-item">
                <div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--olive)' }}>{a.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {a.user?.name || 'System'} · {formatDate(a.createdAt)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
