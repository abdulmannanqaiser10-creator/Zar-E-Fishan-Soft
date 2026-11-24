import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpAPI, clientsAPI, financeAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate, paymentMethods } from '../utils/format';

const EMPTY_ITEM = { description: '', quantity: 1, unitPrice: '' };

export default function SalesReturns() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    client: '',
    invoice: '',
    reason: '',
    refundMethod: 'cash',
    account: '',
    taxAmount: 0,
    items: [{ ...EMPTY_ITEM }],
  });

  const load = useCallback(() => {
    setLoading(true);
    erpAPI
      .salesReturns()
      .then((res) => setRows(res.data.data || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load returns'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    Promise.all([
      clientsAPI.list({ limit: 500 }),
      financeAPI.invoices({ limit: 200, status: 'paid' }),
      erpAPI.accounts(),
    ])
      .then(([c, inv, acc]) => {
        setClients(c.data.data || []);
        setInvoices(inv.data.data || []);
        setAccounts(acc.data.data || []);
      })
      .catch(() => {});
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.client) return toast.error('Client is required');
    const validItems = form.items.filter((it) => it.description?.trim());
    if (!validItems.length) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await erpAPI.createSalesReturn({
        client: form.client,
        invoice: form.invoice || undefined,
        reason: form.reason,
        refundMethod: form.refundMethod,
        account: form.account || undefined,
        taxAmount: Number(form.taxAmount) || 0,
        items: validItems.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
        })),
      });
      toast.success('Sales return recorded');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'returnNumber', label: 'Return #' },
    { key: 'client', label: 'Client', render: (r) => r.client?.name || '—' },
    { key: 'invoice', label: 'Invoice', render: (r) => r.invoice?.invoiceNumber || '—' },
    { key: 'total', label: 'Refund', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Sales Returns"
        subtitle="Customer refunds and returns"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New return
          </button>
        }
      />
      <div className="card">
        {loading ? <LoadingSpinner label="Loading returns..." /> : (
          <DataTable columns={columns} rows={rows} emptyTitle="No sales returns" />
        )}
      </div>

      <Modal
        open={modalOpen}
        title="New sales return"
        large
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" form="sr-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
          </>
        }
      >
        <form id="sr-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="form-group">
              <label>Client *</label>
              <select value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} required>
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Original invoice</label>
              <select value={form.invoice} onChange={(e) => setForm((f) => ({ ...f, invoice: e.target.value }))}>
                <option value="">— Optional —</option>
                {invoices.map((i) => (
                  <option key={i._id} value={i._id}>{i.invoiceNumber}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Refund method</label>
              <select value={form.refundMethod} onChange={(e) => setForm((f) => ({ ...f, refundMethod: e.target.value }))}>
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
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label>Reason</label>
              <textarea rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <h4 className="section-title">Returned items</h4>
          {form.items.map((item, index) => (
            <div key={index} className="form-grid" style={{ marginBottom: '0.5rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <input value={item.description} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, description: e.target.value } : it)) }))} />
              </div>
              <div className="form-group">
                <label>Qty</label>
                <input type="number" min="0" value={item.quantity} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, quantity: e.target.value } : it)) }))} />
              </div>
              <div className="form-group">
                <label>Unit price</label>
                <input type="number" min="0" value={item.unitPrice} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, unitPrice: e.target.value } : it)) }))} />
              </div>
              {form.items.length > 1 && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }))}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}>
            <Plus size={14} /> Add item
          </button>
        </form>
      </Modal>
    </div>
  );
}