import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, FileOutput, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpAPI, clientsAPI, projectsAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/format';

const EMPTY_ITEM = { description: '', quantity: 1, unitPrice: '', discount: 0 };
const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted'];

function computePreview(items, taxRate, discountAmount) {
  const lineSubtotals = items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    return Math.max(0, qty * price - disc);
  });
  const subtotal = Math.round(lineSubtotals.reduce((s, v) => s + v, 0));
  const discount = Math.min(Math.round(Number(discountAmount) || 0), subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = Math.round((taxable * (Number(taxRate) || 0)) / 100);
  return { subtotal, discountAmount: discount, taxAmount, total: taxable + taxAmount };
}

const emptyForm = () => ({
  client: '',
  project: '',
  taxRate: 0,
  discountAmount: 0,
  validUntil: '',
  notes: '',
  status: 'draft',
  items: [{ ...EMPTY_ITEM }],
});

export default function Quotations() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [convertId, setConvertId] = useState(null);
  const [converting, setConverting] = useState(false);

  const preview = useMemo(
    () => computePreview(form.items, form.taxRate, form.discountAmount),
    [form.items, form.taxRate, form.discountAmount],
  );

  const load = useCallback(
    (page = 1) => {
      setLoading(true);
      erpAPI
        .quotations({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter || undefined,
        })
        .then((res) => {
          setRows(res.data.data || []);
          setPagination(res.data.pagination || { page: 1, pages: 1 });
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Failed to load quotations'))
        .finally(() => setLoading(false));
    },
    [search, statusFilter],
  );

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    load(1);
  }, [search, statusFilter, load]);

  useEffect(() => {
    Promise.all([clientsAPI.list({ limit: 500 }), projectsAPI.list({ limit: 500 })])
      .then(([c, p]) => {
        setClients(c.data.data || []);
        setProjects(p.data.data || []);
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    if (row.status === 'converted') {
      toast.error('Converted quotations cannot be edited');
      return;
    }
    setEditing(row);
    setForm({
      client: row.client?._id || row.client || '',
      project: row.project?._id || row.project || '',
      taxRate: row.taxRate ?? 0,
      discountAmount: row.discountAmount ?? 0,
      validUntil: row.validUntil ? String(row.validUntil).slice(0, 10) : '',
      notes: row.notes || '',
      status: row.status || 'draft',
      items: (row.items || []).map((it) => ({
        description: it.description || '',
        quantity: it.quantity ?? 1,
        unitPrice: it.unitPrice ?? '',
        discount: it.discount ?? 0,
      })) || [{ ...EMPTY_ITEM }],
    });
    setModalOpen(true);
  };

  const updateItem = (index, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.client) return toast.error('Client is required');
    const validItems = form.items.filter((it) => it.description?.trim());
    if (!validItems.length) return toast.error('Add at least one line item');
    setSaving(true);
    const payload = {
      client: form.client,
      project: form.project || undefined,
      items: validItems.map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
      })),
      taxRate: Number(form.taxRate) || 0,
      discountAmount: Number(form.discountAmount) || 0,
      validUntil: form.validUntil || undefined,
      notes: form.notes,
      status: form.status,
    };
    try {
      if (editing) {
        await erpAPI.updateQuotation(editing._id, payload);
        toast.success('Quotation updated');
      } else {
        await erpAPI.createQuotation(payload);
        toast.success('Quotation created');
      }
      setModalOpen(false);
      load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmConvert = async () => {
    if (!convertId) return;
    setConverting(true);
    try {
      const res = await erpAPI.convertQuotation(convertId);
      toast.success(`Converted to invoice ${res.data.data?.invoice?.invoiceNumber || ''}`);
      setConvertId(null);
      load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Convert failed');
    } finally {
      setConverting(false);
    }
  };

  const columns = [
    { key: 'quotationNumber', label: 'Quote #' },
    { key: 'client', label: 'Client', render: (r) => r.client?.name || '—' },
    { key: 'project', label: 'Project', render: (r) => r.project?.name || '—' },
    { key: 'validUntil', label: 'Valid until', render: (r) => formatDate(r.validUntil) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      width: '110px',
      render: (r) => (
        <div className="actions">
          {r.status !== 'converted' && (
            <button type="button" className="btn btn-outline btn-sm" title="Edit" onClick={() => openEdit(r)}>
              <Pencil size={14} />
            </button>
          )}
          {r.status !== 'converted' && r.status !== 'rejected' && (
            <button
              type="button"
              className="btn btn-gold btn-sm"
              title="Convert to invoice"
              onClick={() => setConvertId(r._id)}
            >
              <FileOutput size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="Create quotes and convert to invoices"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            New quotation
          </button>
        }
      />
      <div className="card">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search quote #"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <LoadingSpinner label="Loading quotations..." />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No quotations"
            pagination={pagination}
            onPageChange={load}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${editing.quotationNumber}` : 'New quotation'}
        large
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="qt-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="qt-form" onSubmit={handleSave}>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Client *</label>
              <select
                value={form.client}
                onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                required
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Project</label>
              <select
                value={form.project}
                onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tax rate (%)</label>
              <input
                type="number"
                min="0"
                value={form.taxRate}
                onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Discount (PKR)</label>
              <input
                type="number"
                min="0"
                value={form.discountAmount}
                onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Valid until</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.filter((s) => s !== 'converted').map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label>Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <h4 className="section-title">Line items</h4>
          {form.items.map((item, index) => (
            <div key={index} className="form-grid" style={{ marginBottom: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description *</label>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Qty</label>
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Unit price</label>
                <input
                  type="number"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Line discount</label>
                <input
                  type="number"
                  min="0"
                  value={item.discount}
                  onChange={(e) => updateItem(index, 'discount', e.target.value)}
                />
              </div>
              {form.items.length > 1 && (
                <div className="form-group">
                  <label>&nbsp;</label>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}
          >
            <Plus size={14} /> Add line
          </button>
          <div className="card" style={{ padding: '1rem', marginTop: '1rem', background: 'var(--cream-dark, #f5f0e6)' }}>
            <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>{formatCurrency(preview.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount</span>
                <span>−{formatCurrency(preview.discountAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax</span>
                <span>{formatCurrency(preview.taxAmount)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  borderTop: '1px solid var(--border)',
                  paddingTop: '0.5rem',
                }}
              >
                <span>Total</span>
                <span>{formatCurrency(preview.total)}</span>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(convertId)}
        title="Convert to invoice"
        message="Create an invoice from this quotation? This cannot be undone."
        onConfirm={confirmConvert}
        onCancel={() => !converting && setConvertId(null)}
        loading={converting}
      />
    </div>
  );
}
