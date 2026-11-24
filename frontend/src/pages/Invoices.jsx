import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Wallet, Eye, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { financeAPI, clientsAPI, projectsAPI, vendorsAPI, erpAPI, settingsAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate, paymentMethods } from '../utils/format';

const EMPTY_ITEM = { description: '', quantity: 1, unitPrice: '', discount: 0 };
const CORE_METHODS = paymentMethods.filter((m) =>
  ['cash', 'card', 'bank_transfer'].includes(m.value),
);

function roundMoney(n) {
  return Math.round(Number(n) || 0);
}

function computePreview(items, taxRate, discountAmount) {
  const lineSubtotals = items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    return Math.max(0, qty * price - disc);
  });
  const subtotal = roundMoney(lineSubtotals.reduce((s, v) => s + v, 0));
  const discount = Math.min(roundMoney(discountAmount), subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const rate = Number(taxRate) || 0;
  const taxAmount = roundMoney((taxable * rate) / 100);
  const total = taxable + taxAmount;
  return { subtotal, discountAmount: discount, taxAmount, total };
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [company, setCompany] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceType: 'client',
    client: '',
    vendor: '',
    project: '',
    account: '',
    paymentMethod: 'bank_transfer',
    taxRate: 0,
    discountAmount: 0,
    dueDate: '',
    notes: '',
    status: 'draft',
    items: [{ ...EMPTY_ITEM }],
  });

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'bank_transfer',
    account: '',
    date: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  });
  const [paying, setPaying] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const preview = useMemo(
    () =>
      computePreview(
        invoiceForm.items,
        invoiceForm.taxRate,
        invoiceForm.discountAmount,
      ),
    [invoiceForm.items, invoiceForm.taxRate, invoiceForm.discountAmount],
  );

  const isPayableType =
    invoiceForm.invoiceType === 'supplier' || invoiceForm.invoiceType === 'purchase';

  const loadInvoices = useCallback(
    (page = 1) => {
      setLoading(true);
      financeAPI
        .invoices({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter || undefined,
          invoiceType: typeFilter || undefined,
        })
        .then((res) => {
          setInvoices(res.data.data || []);
          setPagination(res.data.pagination || { page: 1, pages: 1 });
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Failed to load invoices'))
        .finally(() => setLoading(false));
    },
    [search, statusFilter, typeFilter],
  );

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadInvoices(1);
  }, [search, statusFilter, typeFilter, loadInvoices]);

  useEffect(() => {
    Promise.all([
      clientsAPI.list({ limit: 500 }),
      projectsAPI.list({ limit: 500 }),
      vendorsAPI.list({ limit: 500 }),
      erpAPI.accounts(),
      settingsAPI.get(),
    ])
      .then(([c, p, v, a, s]) => {
        setClients(c.data.data || []);
        setProjects(p.data.data || []);
        setVendors(v.data.data || []);
        setAccounts(a.data.data || []);
        setCompany(s.data.data || null);
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setInvoiceForm({
      invoiceType: 'client',
      client: '',
      vendor: '',
      project: '',
      account: '',
      paymentMethod: 'bank_transfer',
      taxRate: company?.taxRate ?? 0,
      discountAmount: 0,
      dueDate: '',
      notes: '',
      status: 'draft',
      items: [{ ...EMPTY_ITEM }],
    });
    setCreateOpen(true);
  };

  const updateItem = (index, field, value) => {
    setInvoiceForm((f) => {
      const items = f.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return { ...f, items };
    });
  };

  const addItem = () => {
    setInvoiceForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  };

  const removeItem = (index) => {
    setInvoiceForm((f) => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isPayableType && !invoiceForm.client) {
      toast.error('Client is required');
      return;
    }
    if (isPayableType && !invoiceForm.vendor) {
      toast.error('Vendor is required');
      return;
    }
    const validItems = invoiceForm.items.filter((it) => it.description?.trim());
    if (!validItems.length) {
      toast.error('Add at least one line item');
      return;
    }
    setSaving(true);
    try {
      await financeAPI.createInvoice({
        invoiceType: invoiceForm.invoiceType,
        client: !isPayableType ? invoiceForm.client : undefined,
        vendor: isPayableType ? invoiceForm.vendor : undefined,
        project: invoiceForm.project || undefined,
        account: invoiceForm.account || undefined,
        items: validItems.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
        })),
        taxRate: Number(invoiceForm.taxRate) || 0,
        discountAmount: Number(invoiceForm.discountAmount) || 0,
        dueDate: invoiceForm.dueDate || undefined,
        notes: invoiceForm.notes,
        status: invoiceForm.status,
      });
      toast.success('Invoice created');
      setCreateOpen(false);
      loadInvoices(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (inv) => {
    if (inv.status === 'cancelled' || inv.status === 'paid') return;
    setPaymentTarget(inv);
    setPaymentForm({
      amount: String(inv.remainingBalance ?? inv.total ?? ''),
      method: 'bank_transfer',
      account: inv.account?._id || inv.account || '',
      date: new Date().toISOString().slice(0, 10),
      reference: '',
      notes: '',
    });
    setPaymentOpen(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!paymentTarget || !paymentForm.amount) {
      toast.error('Amount is required');
      return;
    }
    setPaying(true);
    try {
      await financeAPI.recordPayment(paymentTarget._id, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        account: paymentForm.account || undefined,
        date: paymentForm.date,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });
      toast.success('Payment recorded');
      setPaymentOpen(false);
      loadInvoices(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const openView = async (inv) => {
    setViewOpen(true);
    setViewLoading(true);
    try {
      const res = await financeAPI.getInvoice(inv._id);
      setViewInvoice(res.data.data);
      if (res.data.company) setCompany(res.data.company);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load invoice');
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await financeAPI.deleteInvoice(deleteId);
      toast.success('Invoice deleted');
      setDeleteId(null);
      loadInvoices(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    {
      key: 'invoiceType',
      label: 'Type',
      render: (r) => <StatusBadge status={r.invoiceType || 'client'} />,
    },
    {
      key: 'party',
      label: 'Party',
      render: (r) => r.client?.name || r.vendor?.name || '—',
    },
    { key: 'project', label: 'Project', render: (r) => r.project?.name || '—' },
    { key: 'issueDate', label: 'Issued', render: (r) => formatDate(r.issueDate) },
    { key: 'dueDate', label: 'Due', render: (r) => formatDate(r.dueDate) },
    {
      key: 'total',
      label: 'Total',
      render: (r) => formatCurrency(r.total),
    },
    {
      key: 'remainingBalance',
      label: 'Balance',
      render: (r) => formatCurrency(r.remainingBalance),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      width: '140px',
      render: (r) => (
        <div className="actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => openView(r)} title="View / print">
            <Eye size={14} />
          </button>
          {r.status !== 'paid' && r.status !== 'cancelled' && (
            <button type="button" className="btn btn-gold btn-sm" onClick={() => openPayment(r)} title="Record payment">
              <Wallet size={14} />
            </button>
          )}
          {(r.paidAmount || 0) === 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteId(r._id)} title="Delete">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Client, supplier and purchase billing"
        actions={
          <>
            <Link to="/finance" className="btn btn-outline">
              <ArrowLeft size={16} />
              Finance
            </Link>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              New invoice
            </button>
          </>
        }
      />

      <div className="card">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search invoices..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="client">Client</option>
            <option value="supplier">Supplier</option>
            <option value="purchase">Purchase</option>
          </select>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading invoices..." />
        ) : (
          <DataTable
            columns={columns}
            rows={invoices}
            emptyTitle="No invoices"
            emptyDescription="Create an invoice for a client or vendor."
            pagination={pagination}
            onPageChange={(p) => loadInvoices(p)}
          />
        )}
      </div>

      <Modal
        open={createOpen}
        title="New invoice"
        large
        onClose={() => !saving && setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="invoice-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create invoice'}
            </button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={handleCreate}>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Invoice type *</label>
              <select
                value={invoiceForm.invoiceType}
                onChange={(e) =>
                  setInvoiceForm((f) => ({
                    ...f,
                    invoiceType: e.target.value,
                    client: '',
                    vendor: '',
                  }))
                }
              >
                <option value="client">Client</option>
                <option value="supplier">Supplier</option>
                <option value="purchase">Purchase</option>
              </select>
            </div>
            {!isPayableType ? (
              <div className="form-group">
                <label>Client *</label>
                <select
                  value={invoiceForm.client}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, client: e.target.value }))}
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
            ) : (
              <div className="form-group">
                <label>Vendor *</label>
                <select
                  value={invoiceForm.vendor}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, vendor: e.target.value }))}
                  required
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Project</label>
              <select
                value={invoiceForm.project}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, project: e.target.value }))}
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
              <label>Account</label>
              <select
                value={invoiceForm.account}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, account: e.target.value }))}
              >
                <option value="">— Default —</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Payment method</label>
              <select
                value={invoiceForm.paymentMethod}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              >
                {CORE_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tax rate (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={invoiceForm.taxRate}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, taxRate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Invoice discount (PKR)</label>
              <input
                type="number"
                min="0"
                value={invoiceForm.discountAmount}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, discountAmount: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Due date</label>
              <input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={invoiceForm.status}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </div>
            <div className="form-group full">
              <label>Notes</label>
              <textarea
                rows={2}
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <h4 className="section-title">Line items</h4>
          {invoiceForm.items.map((item, index) => (
            <div key={index} className="form-grid" style={{ marginBottom: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description *</label>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Item description"
                />
              </div>
              <div className="form-group">
                <label>Qty</label>
                <input
                  type="number"
                  min="0"
                  step="any"
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
              {invoiceForm.items.length > 1 && (
                <div className="form-group">
                  <label>&nbsp;</label>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => removeItem(index)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" onClick={addItem} style={{ marginBottom: '1rem' }}>
            <Plus size={14} />
            Add line
          </button>

          <div
            className="card"
            style={{
              padding: '1rem',
              background: 'var(--cream-dark, #f5f0e6)',
              marginTop: '0.5rem',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              <strong>Preview</strong> (server recalculates on save)
            </p>
            <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
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

      <Modal
        open={paymentOpen}
        title={paymentTarget ? `Payment — ${paymentTarget.invoiceNumber}` : 'Record payment'}
        onClose={() => !paying && setPaymentOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setPaymentOpen(false)} disabled={paying}>
              Cancel
            </button>
            <button type="submit" form="payment-form" className="btn btn-primary" disabled={paying}>
              {paying ? 'Recording...' : 'Record payment'}
            </button>
          </>
        }
      >
        <form id="payment-form" onSubmit={submitPayment}>
          {paymentTarget && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 0 }}>
              Outstanding: <strong>{formatCurrency(paymentTarget.remainingBalance)}</strong>
            </p>
          )}
          <div className="form-grid">
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                min="1"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Method</label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
              >
                {CORE_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Account</label>
              <select
                value={paymentForm.account}
                onChange={(e) => setPaymentForm((f) => ({ ...f, account: e.target.value }))}
              >
                <option value="">— Default —</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Reference</label>
              <input
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <div className="form-group full">
              <label>Notes</label>
              <textarea
                rows={2}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={viewOpen}
        title={viewInvoice ? `Invoice ${viewInvoice.invoiceNumber}` : 'Invoice'}
        large
        onClose={() => setViewOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setViewOpen(false)}>
              Close
            </button>
            <button type="button" className="btn btn-primary" onClick={printInvoice}>
              <Printer size={16} />
              Print
            </button>
          </>
        }
      >
        {viewLoading || !viewInvoice ? (
          <LoadingSpinner label="Loading invoice..." />
        ) : (
          <div className="invoice-print-panel" id="invoice-print-panel">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1.5rem',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid var(--olive)',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {company?.logo ? (
                  <img
                    src={company.logo}
                    alt={company.companyName || 'Logo'}
                    style={{ maxHeight: 72, maxWidth: 140, objectFit: 'contain' }}
                  />
                ) : null}
                <div>
                  <h2 style={{ margin: 0, color: 'var(--olive)', fontSize: '1.35rem' }}>
                    {company?.companyName || 'Zar-E-Fishan'}
                  </h2>
                  {company?.address && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {company.address}
                    </p>
                  )}
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {[company?.phone, company?.email].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{viewInvoice.invoiceNumber}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <StatusBadge status={viewInvoice.invoiceType || 'client'} />{' '}
                  <StatusBadge status={viewInvoice.status} />
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: 6 }}>
                  Issued {formatDate(viewInvoice.issueDate)}
                  {viewInvoice.dueDate ? ` · Due ${formatDate(viewInvoice.dueDate)}` : ''}
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Bill to
                </div>
                <strong>
                  {viewInvoice.client?.name || viewInvoice.vendor?.name || '—'}
                </strong>
                {viewInvoice.project?.name && (
                  <div style={{ fontSize: '0.85rem' }}>Project: {viewInvoice.project.name}</div>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Discount</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewInvoice.items || []).map((it, i) => (
                    <tr key={i}>
                      <td>{it.description}</td>
                      <td>{it.quantity}</td>
                      <td>{formatCurrency(it.unitPrice)}</td>
                      <td>{formatCurrency(it.discount)}</td>
                      <td>{formatCurrency(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ maxWidth: 280, marginLeft: 'auto', marginTop: '1rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>{formatCurrency(viewInvoice.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount</span>
                <span>−{formatCurrency(viewInvoice.discountAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{company?.taxLabel || 'Tax'} ({viewInvoice.taxRate || 0}%)</span>
                <span>{formatCurrency(viewInvoice.taxAmount)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  borderTop: '1px solid var(--border)',
                  marginTop: '0.5rem',
                  paddingTop: '0.5rem',
                  fontSize: '1.05rem',
                }}
              >
                <span>Total</span>
                <span>{formatCurrency(viewInvoice.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <span>Paid</span>
                <span>{formatCurrency(viewInvoice.paidAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Balance</span>
                <span>{formatCurrency(viewInvoice.remainingBalance)}</span>
              </div>
            </div>

            {viewInvoice.notes && (
              <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Notes: {viewInvoice.notes}
              </p>
            )}
            {company?.invoiceFooter && (
              <p
                style={{
                  marginTop: '1.5rem',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: 'var(--olive)',
                  borderTop: '1px dashed var(--border)',
                  paddingTop: '0.75rem',
                }}
              >
                {company.invoiceFooter}
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete invoice"
        message="Only unpaid invoices can be deleted. This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
