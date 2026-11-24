import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { erpAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/format';

export default function Ledger() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [accountFilter, setAccountFilter] = useState('');

  const load = useCallback(
    (page = 1) => {
      setLoading(true);
      erpAPI
        .ledger({
          page,
          limit: 50,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          account: accountFilter || undefined,
        })
        .then((res) => {
          setRows(res.data.data || []);
          setSummary(res.data.summary || null);
          setPagination(res.data.pagination || { page: 1, pages: 1 });
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Failed to load ledger'))
        .finally(() => setLoading(false));
    },
    [startDate, endDate, accountFilter],
  );

  useEffect(() => {
    erpAPI.accounts().then((res) => setAccounts(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    load(1);
  }, [startDate, endDate, accountFilter, load]);

  const columns = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'type', label: 'Type', render: (r) => <StatusBadge status={r.type} /> },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'account', label: 'Account', render: (r) => r.account?.name || '—' },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span style={{ color: r.type === 'credit' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
          {r.type === 'credit' ? '+' : '-'}{formatCurrency(r.amount)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Ledger" subtitle="Double-entry activity log" />
      {summary && (
        <div className="stat-grid">
          <StatCard label="Credits (page)" value={formatCurrency(summary.credits)} />
          <StatCard label="Debits (page)" value={formatCurrency(summary.debits)} />
          <StatCard label="Net (page)" value={formatCurrency(summary.net)} />
        </div>
      )}
      <div className="card">
        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label>From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Account</label>
            <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <LoadingSpinner label="Loading ledger..." />
        ) : (
          <DataTable columns={columns} rows={rows} emptyTitle="No ledger entries" pagination={pagination} onPageChange={load} />
        )}
      </div>
    </div>
  );
}