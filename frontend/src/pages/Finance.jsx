import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  FileText,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  financeAPI,
  clientsAPI,
  projectsAPI,
  vendorsAPI,
  procurementAPI,
} from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import { formatCurrency, formatDate, paymentMethods } from '../utils/format';

const EMPTY_TXN = {
  type: 'income',
  category: '',
  amount: '',
  paymentMethod: 'bank_transfer',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  reference: '',
  project: '',
  client: '',
  vendor: '',
};

const TABS = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'receivables', label: 'Receivables' },
  { id: 'payables', label: 'Payables' },
];

export default function Finance() {
  const [tab, setTab] = useState('transactions');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [txPage, setTxPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loadingTx, setLoadingTx] = useState(true);

  const [receivables, setReceivables] = useState([]);
  const [receivablesTotal, setReceivablesTotal] = useState(0);
  const [loadingRec, setLoadingRec] = useState(false);

  const [payables, setPayables] = useState([]);
  const [payablesTotal, setPayablesTotal] = useState(0);
  const [loadingPay, setLoadingPay] = useState(false);

  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_TXN);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadSummary = useCallback(() => {
    financeAPI.summary().then((res) => setSummary(res.data.data)).catch(() => {});
  }, []);

  const loadLookups = useCallback(() => {
    Promise.all([
      clientsAPI.list({ limit: 500 }),
      projectsAPI.list({ limit: 500 }),
      vendorsAPI.list({ limit: 500 }),
    ])
      .then(([c, p, v]) => {
        setClients(c.data.data || []);
        setProjects(p.data.data || []);
        setVendors(v.data.data || []);
      })
      .catch(() => {});
  }, []);

  const loadTransactions = useCallback(
    (page = 1) => {
      setLoadingTx(true);
      financeAPI
        .transactions({
          page,
          limit: 20,
          type: typeFilter || undefined,
          search: search || undefined,
        })
        .then((res) => {
          setTransactions(res.data.data || []);
          setPagination(res.data.pagination || { page: 1, pages: 1 });
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Failed to load transactions'))
        .finally(() => setLoadingTx(false));
    },
    [typeFilter, search],
  );

  const loadReceivables = useCallback(() => {
    setLoadingRec(true);
    financeAPI
      .receivables()
      .then((res) => {
        setReceivables(res.data.data || []);
        setReceivablesTotal(res.data.total || 0);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load receivables'))
      .finally(() => setLoadingRec(false));
  }, []);

  const loadPayables = useCallback(() => {
    setLoadingPay(true);
    procurementAPI
      .payables()
      .then((res) => {
        setPayables(res.data.data || []);
        setPayablesTotal(res.data.total || 0);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load payables'))
      .finally(() => setLoadingPay(false));
  }, []);

  useEffect(() => {
    loadSummary();
    loadLookups();
  }, [loadSummary, loadLookups]);

  useEffect(() => {
    if (tab === 'receivables') loadReceivables();
  }, [tab, loadReceivables]);

  useEffect(() => {
    if (tab === 'payables') loadPayables();
  }, [tab, loadPayables]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setTxPage(1);
  }, [typeFilter, search]);

  useEffect(() => {
    if (tab === 'transactions') loadTransactions(txPage);
  }, [tab, txPage, typeFilter, search, loadTransactions]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_TXN, date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    if (row.invoice || row.purchaseOrder) {
      toast.error('Linked invoice/PO transactions cannot be edited');
      return;
    }
    setEditing(row);
    setForm({
      type: row.type,
      category: row.category,
      amount: String(row.amount),
      paymentMethod: row.paymentMethod || 'bank_transfer',
      date: row.date ? String(row.date).slice(0, 10) : '',
      description: row.description || '',
      reference: row.reference || '',
      project: row.project?._id || row.project || '',
      client: row.client?._id || row.client || '',
      vendor: row.vendor?._id || row.vendor || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.category?.trim() || !form.amount) {
      toast.error('Category and amount are required');
      return;
    }
    setSaving(true);
    const payload = {
      type: form.type,
      category: form.category.trim(),
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      date: form.date,
      description: form.description,
      reference: form.reference,
      project: form.project || undefined,
      client: form.client || undefined,
      vendor: form.vendor || undefined,
    };
    try {
      if (editing) {
        await financeAPI.updateTransaction(editing._id, payload);
        toast.success('Transaction updated');
      } else {
        await financeAPI.createTransaction(payload);
        toast.success('Transaction created');
      }
      setModalOpen(false);
      loadTransactions(txPage);
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await financeAPI.deleteTransaction(deleteId);
      toast.success('Transaction deleted');
      setDeleteId(null);
      loadTransactions(txPage);
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const txnColumns = [
    { key: 'transactionId', label: 'ID', width: '110px' },
    {
      key: 'date',
      label: 'Date',
      render: (r) => formatDate(r.date),
    },
    {
      key: 'type',
      label: 'Type',
      render: (r) => <StatusBadge status={r.type} />,
    },
    { key: 'category', label: 'Category' },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span style={{ fontWeight: 600, color: r.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
          {r.type === 'income' ? '+' : '-'}
          {formatCurrency(r.amount)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Method',
      render: (r) => String(r.paymentMethod || '').replace(/_/g, ' '),
    },
    {
      key: 'links',
      label: 'Links',
      render: (r) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {[r.client?.name, r.project?.name, r.vendor?.name].filter(Boolean).join(' · ') || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '88px',
      render: (r) => (
        <div className="actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => openEdit(r)}
            title="Edit"
            disabled={Boolean(r.invoice || r.purchaseOrder)}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDeleteId(r._id)}
            title="Delete"
            disabled={Boolean(r.invoice || r.purchaseOrder)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const recColumns = [
    { key: 'invoiceNumber', label: 'Invoice' },
    { key: 'client', label: 'Client', render: (r) => r.client?.name || '—' },
    { key: 'project', label: 'Project', render: (r) => r.project?.name || '—' },
    { key: 'dueDate', label: 'Due', render: (r) => formatDate(r.dueDate) },
    {
      key: 'remainingBalance',
      label: 'Balance',
      render: (r) => formatCurrency(r.remainingBalance),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const payColumns = [
    { key: 'poNumber', label: 'PO' },
    { key: 'vendor', label: 'Vendor', render: (r) => r.vendor?.name || '—' },
    { key: 'project', label: 'Project', render: (r) => r.project?.name || '—' },
    { key: 'orderDate', label: 'Date', render: (r) => formatDate(r.orderDate) },
    {
      key: 'remainingBalance',
      label: 'Balance',
      render: (r) => formatCurrency(r.remainingBalance),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Transactions, receivables and payables overview"
        actions={
          <Link to="/finance/invoices" className="btn btn-outline">
            <FileText size={16} />
            Invoices
          </Link>
        }
      />

      {summary && (
        <div className="stat-grid">
          <StatCard label="Income" value={formatCurrency(summary.income)} icon={TrendingUp} />
          <StatCard label="Expenses" value={formatCurrency(summary.expenses)} icon={TrendingDown} />
          <StatCard label="Profit" value={formatCurrency(summary.profit)} icon={CircleDollarSign} />
        </div>
      )}

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="card">
          <div className="toolbar">
            <input
              className="search-input"
              placeholder="Search transactions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              New transaction
            </button>
          </div>
          {loadingTx ? (
            <LoadingSpinner label="Loading transactions..." />
          ) : (
            <DataTable
              columns={txnColumns}
              rows={transactions}
              emptyTitle="No transactions"
              emptyDescription="Record income and expenses to track cash flow."
              pagination={pagination}
              onPageChange={(p) => setTxPage(p)}
            />
          )}
        </div>
      )}

      {tab === 'receivables' && (
        <div className="card">
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>
                Outstanding receivables
              </h3>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Total: <strong>{formatCurrency(receivablesTotal)}</strong>
              </p>
            </div>
            <Link to="/finance/invoices" className="btn btn-gold">
              <FileText size={16} />
              Manage invoices
            </Link>
          </div>
          {loadingRec ? (
            <LoadingSpinner label="Loading receivables..." />
          ) : (
            <DataTable
              columns={recColumns}
              rows={receivables}
              emptyTitle="No outstanding receivables"
              emptyDescription="Sent and partial invoices appear here."
            />
          )}
        </div>
      )}

      {tab === 'payables' && (
        <div className="card">
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>
                Vendor payables
              </h3>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Total: <strong>{formatCurrency(payablesTotal)}</strong>
              </p>
            </div>
            <Link to="/procurement" className="btn btn-outline">
              <ExternalLink size={16} />
              Procurement module
            </Link>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
            Payables are tied to purchase orders. Record vendor payments in Procurement.
          </p>
          {loadingPay ? (
            <LoadingSpinner label="Loading payables..." />
          ) : (
            <DataTable
              columns={payColumns}
              rows={payables}
              emptyTitle="No outstanding payables"
              emptyDescription="Open purchase order balances appear here."
            />
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit transaction' : 'New transaction'}
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="txn-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="txn-form" onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setField('type', e.target.value)}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="form-group">
              <label>Category *</label>
              <input
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                placeholder="e.g. Materials, Salary"
                required
              />
            </div>
            <div className="form-group">
              <label>Amount (PKR) *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => setField('amount', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Payment method</label>
              <select value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)}>
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Reference</label>
              <input value={form.reference} onChange={(e) => setField('reference', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Client</label>
              <select value={form.client} onChange={(e) => setField('client', e.target.value)}>
                <option value="">— None —</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Project</label>
              <select value={form.project} onChange={(e) => setField('project', e.target.value)}>
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Vendor</label>
              <select value={form.vendor} onChange={(e) => setField('vendor', e.target.value)}>
                <option value="">— None —</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label>Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete transaction"
        message="This transaction will be permanently removed."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}