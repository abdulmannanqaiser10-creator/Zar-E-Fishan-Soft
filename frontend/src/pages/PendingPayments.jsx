import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/format';

const REFRESH_MS = 60000;

function urgencyStyle(dueDate) {
  if (!dueDate) return {};
  const due = new Date(dueDate);
  const now = new Date();
  const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return { background: 'rgba(180,60,60,0.1)', borderLeft: '3px solid var(--danger)' };
  }
  if (days <= 3) {
    return { background: 'rgba(197,166,117,0.2)', borderLeft: '3px solid var(--gold)' };
  }
  if (days <= 7) {
    return { background: 'rgba(63,73,50,0.06)', borderLeft: '3px solid var(--olive)' };
  }
  return {};
}

function urgencyLabel(dueDate) {
  if (!dueDate) return '—';
  const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days <= 7) return `${days}d left`;
  return formatDate(dueDate);
}

export default function PendingPayments() {
  const [loading, setLoading] = useState(true);
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [totals, setTotals] = useState({ receivables: 0, payables: 0 });
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    erpAPI
      .pendingPayments()
      .then((res) => {
        const d = res.data.data || {};
        setReceivables(d.receivables || []);
        setPayables(d.payables || []);
        setNotifications(d.notifications || []);
        setTotals(res.data.totals || { receivables: 0, payables: 0 });
        setLastRefresh(new Date());
      })
      .catch((err) => {
        if (!silent) toast.error(err.response?.data?.message || 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const recvColumns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'client', label: 'Client', render: (r) => r.client?.name || '—' },
    {
      key: 'dueDate',
      label: 'Urgency',
      render: (r) => (
        <span style={{ fontWeight: 600, color: urgencyLabel(r.dueDate).includes('overdue') ? 'var(--danger)' : undefined }}>
          {urgencyLabel(r.dueDate)}
        </span>
      ),
    },
    { key: 'remainingBalance', label: 'Balance', render: (r) => formatCurrency(r.remainingBalance) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const payColumns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'vendor', label: 'Vendor', render: (r) => r.vendor?.name || '—' },
    {
      key: 'dueDate',
      label: 'Urgency',
      render: (r) => (
        <span style={{ fontWeight: 600, color: urgencyLabel(r.dueDate).includes('overdue') ? 'var(--danger)' : undefined }}>
          {urgencyLabel(r.dueDate)}
        </span>
      ),
    },
    { key: 'remainingBalance', label: 'Balance', render: (r) => formatCurrency(r.remainingBalance) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  if (loading && !lastRefresh) return <LoadingSpinner label="Loading pending payments..." />;

  return (
    <div>
      <PageHeader
        title="Pending Payments"
        subtitle={
          lastRefresh
            ? `Overdue client invoices & supplier payables · refreshed ${lastRefresh.toLocaleTimeString()}`
            : 'Alerts, receivables, and payables'
        }
        actions={
          <>
            <button type="button" className="btn btn-outline" onClick={() => load()}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <Link to="/finance/invoices" className="btn btn-outline">
              View invoices
            </Link>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard label="Total receivables" value={formatCurrency(totals.receivables)} />
        <StatCard label="Total payables" value={formatCurrency(totals.payables)} />
        <StatCard label="Alerts" value={notifications.length} icon={Bell} />
      </div>

      {notifications.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 className="section-title">
            <Bell size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Notifications
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {notifications.map((n, i) => (
              <div
                key={`${n.id}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem',
                  borderRadius: 8,
                  ...urgencyStyle(n.dueDate),
                  background:
                    n.type === 'overdue'
                      ? 'rgba(180,60,60,0.08)'
                      : urgencyStyle(n.dueDate).background || 'rgba(197,166,117,0.15)',
                }}
              >
                <AlertTriangle size={18} color={n.type === 'overdue' ? 'var(--danger)' : 'var(--gold)'} />
                <div style={{ flex: 1 }}>
                  <strong>{n.invoiceNumber}</strong> — {n.party} · {formatCurrency(n.amount)}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {n.kind === 'receivable' ? 'Receivable' : 'Payable'} · {urgencyLabel(n.dueDate)} ·{' '}
                    <StatusBadge status={n.type} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3 className="section-title">Client receivables</h3>
          <DataTable
            columns={recvColumns}
            rows={receivables}
            emptyTitle="No open receivables"
            rowStyle={(r) => urgencyStyle(r.dueDate)}
          />
        </div>
        <div className="card">
          <h3 className="section-title">Supplier payables</h3>
          <DataTable
            columns={payColumns}
            rows={payables}
            emptyTitle="No open payables"
            rowStyle={(r) => urgencyStyle(r.dueDate)}
          />
        </div>
      </div>
    </div>
  );
}
