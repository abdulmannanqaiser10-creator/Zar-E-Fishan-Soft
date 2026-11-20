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
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { dashboardAPI } from '../api';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import PageHeader from '../components/common/PageHeader';
import { formatCurrency, formatDate } from '../utils/format';

const PIE_COLORS = ['#3F4932', '#C5A675', '#5a6548', '#a88955'];

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

  const { stats, monthlyChart, projectStatusOverview, recentProjects, recentTransactions, recentActivities, lowStockAlerts } = data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of projects, finance and operations"
      />

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
          <h3 className="section-title">Monthly Revenue & Expenses</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4dcc8" />
                <XAxis dataKey="label" tick={{ fill: '#6b7260', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7260', fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#3F4932" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#C5A675" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Project Status Overview</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={projectStatusOverview}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
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

      <div className="grid-3">
        <div className="card">
          <h3 className="section-title">Recent Projects</h3>
          {recentProjects?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentProjects.map((p) => (
                <Link key={p._id} to={`/projects/${p._id}`} style={{ display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div>
                      <strong style={{ color: 'var(--olive)' }}>{p.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {p.client?.name} · {p.projectId}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No projects yet</p>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Recent Transactions</h3>
          {recentTransactions?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentTransactions.map((t) => (
                <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
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
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No transactions yet</p>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Activities & Alerts</h3>
          {lowStockAlerts?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              {lowStockAlerts.map((m) => (
                <div
                  key={m._id}
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.5rem 0',
                    color: '#8a6a1f',
                    fontSize: '0.85rem',
                  }}
                >
                  <AlertTriangle size={14} />
                  Low stock: {m.name} ({m.quantity} {m.unit})
                </div>
              ))}
            </div>
          )}
          {recentActivities?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentActivities.map((a) => (
                <div key={a._id}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--olive)' }}>{a.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {a.user?.name || 'System'} · {formatDate(a.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
