import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate, paymentMethods } from '../utils/format';

const emptyForm = () => ({
  title: '',
  category: 'other',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'cash',
  notes: '',
  account: '',
  project: '',
  vendor: '',
});

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [accounts, setAccounts] = useState([]);

  const load = useCallback(
    (page = 1) => {
      setLoading(true);
      erpAPI
        .expenses({ page, limit: 20, category: categoryFilter || undefined })
        .then((res) => {
          setRows(res.data.data || []);
          setPagination(res.data.pagination || { page: 1, pages: 1 });
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Failed to load expenses'))
        .finally(() => setLoading(false));
    },
    [categoryFilter],
  );

  useEffect(() => {
    load(1);
  }, [categoryFilter, load]);

  useEffect(() => {
    erpAPI.accounts().then((res) => setAccounts(res.data.data || [])).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) {
      toast.error('Title and amount are required');
      return;
    }
    setSaving(true);
    try {
      await erpAPI.createExpense({
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        account: form.account || undefined,
        project: form.project || undefined,
        vendor: form.vendor || undefined,
      });
      toast.success('Expense recorded');
      setModalOpen(false);
      setForm(emptyForm());
      load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await erpAPI.deleteExpense(deleteId);
      toast.success('Expense deleted');
      setDeleteId(null);
      load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'expenseNumber', label: 'Expense #' },
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'paymentMethod', label: 'Method' },
    {
      key: 'actions',
      label: '',
      width: '60px',
      render: (r) => (
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteId(r._id)}>
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="General Expenses"
        subtitle="Business expenses outside project billing"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Add expense
          </button>
        }
      />
      <div className="card">
        <div className="toolbar">
          <input className="search-input" placeholder="Filter category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
        </div>
        {loading ? <LoadingSpinner label="Loading expenses..." /> : (
          <DataTable columns={columns} rows={rows} emptyTitle="No expenses" pagination={pagination} onPageChange={load} />
        )}
      </div>

      <Modal
        open={modalOpen}
        title="New expense"
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" form="exp-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <form id="exp-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Title *</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Amount *</label>
              <input type="number" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Payment method</label>
              <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Account</label>
              <select value={form.account} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}>
                <option value="">— Default —</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>{a.name} ({a.type})</option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(deleteId)} title="Delete expense" message="Remove this expense record?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
}