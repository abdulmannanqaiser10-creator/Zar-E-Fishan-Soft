import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency } from '../utils/format';

const emptyForm = () => ({
  name: '',
  type: 'cash',
  bankName: '',
  accountNumber: '',
  openingBalance: '',
  notes: '',
});

export default function Accounts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    erpAPI
      .accounts()
      .then((res) => setRows(res.data.data || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load accounts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      type: row.type || 'cash',
      bankName: row.bankName || '',
      accountNumber: row.accountNumber || '',
      openingBalance: '',
      notes: row.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Account name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await erpAPI.updateAccount(editing._id, {
          name: form.name.trim(),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          notes: form.notes.trim(),
        });
        toast.success('Account updated');
      } else {
        await erpAPI.createAccount({
          name: form.name.trim(),
          type: form.type,
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          openingBalance: Number(form.openingBalance) || 0,
          notes: form.notes.trim(),
        });
        toast.success('Account created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Account' },
    { key: 'type', label: 'Type', render: (r) => <StatusBadge status={r.type} /> },
    { key: 'bankName', label: 'Bank', render: (r) => r.bankName || '—' },
    { key: 'currentBalance', label: 'Balance', render: (r) => formatCurrency(r.currentBalance) },
    {
      key: 'actions',
      label: '',
      width: '60px',
      render: (r) => (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>
          <Pencil size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cash & Bank Accounts"
        subtitle="Manage liquidity accounts"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New account
          </button>
        }
      />
      <div className="card">
        {loading ? <LoadingSpinner label="Loading accounts..." /> : (
          <DataTable columns={columns} rows={rows} emptyTitle="No accounts" />
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit account' : 'New account'}
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" form="acc-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <form id="acc-form" onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            {!editing && (
              <div className="form-group">
                <label>Type *</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Bank name</label>
              <input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Account number</label>
              <input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
            </div>
            {!editing && (
              <div className="form-group">
                <label>Opening balance</label>
                <input type="number" min="0" value={form.openingBalance} onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))} />
              </div>
            )}
            <div className="form-group full">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}