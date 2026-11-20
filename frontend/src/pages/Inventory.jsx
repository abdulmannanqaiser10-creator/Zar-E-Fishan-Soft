import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/common/StatCard';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';

const emptyForm = {
  name: '', sku: '', category: '', quantity: 0, unit: 'pcs',
  costPrice: '', sellingPrice: '', reorderLevel: 10, description: '',
};

export default function Inventory() {
  const [tab, setTab] = useState('materials');
  const [rows, setRows] = useState([]);
  const [movements, setMovements] = useState([]);
  const [valuation, setValuation] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [stockType, setStockType] = useState('in');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [stockForm, setStockForm] = useState({ quantity: '', unitCost: '', reason: '', reference: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryAPI.list({ search, lowStock: lowStock ? 'true' : undefined, page, limit: 10 });
      setRows(res.data.data);
      setPagination(res.data.pagination);
      setValuation(res.data.valuation || 0);
      setLowStockCount(res.data.lowStockCount || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [search, lowStock, page]);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryAPI.movements({ page: 1, limit: 50 });
      setMovements(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load movements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'materials') load();
    else loadMovements();
  }, [tab, load, loadMovements]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.category || form.costPrice === '') {
      toast.error('Name, SKU, category and cost price are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity) || 0,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
      };
      if (editing) {
        const { quantity, ...rest } = payload;
        await inventoryAPI.update(editing._id, rest);
      } else {
        await inventoryAPI.create(payload);
      }
      toast.success(editing ? 'Material updated' : 'Material created');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleStock = async (e) => {
    e.preventDefault();
    if (!stockForm.quantity) return toast.error('Quantity required');
    setSaving(true);
    try {
      const payload = {
        quantity: Number(stockForm.quantity),
        unitCost: stockForm.unitCost !== '' ? Number(stockForm.unitCost) : undefined,
        reason: stockForm.reason,
        reference: stockForm.reference,
      };
      if (stockType === 'in') await inventoryAPI.stockIn(selected._id, payload);
      else await inventoryAPI.stockOut(selected._id, payload);
      toast.success(stockType === 'in' ? 'Stock added' : 'Stock issued');
      setStockOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Stock update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await inventoryAPI.remove(deleteId);
      toast.success('Material deactivated');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { key: 'sku', label: 'SKU', render: (r) => <strong>{r.sku}</strong> },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    {
      key: 'quantity',
      label: 'Qty',
      render: (r) => (
        <span style={{ color: r.quantity <= r.reorderLevel ? '#a8483d' : 'inherit', fontWeight: 600 }}>
          {formatNumber(r.quantity)} {r.unit}
        </span>
      ),
    },
    { key: 'costPrice', label: 'Cost', render: (r) => formatCurrency(r.costPrice) },
    { key: 'value', label: 'Value', render: (r) => formatCurrency((r.quantity || 0) * (r.costPrice || 0)) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="actions">
          <button type="button" className="btn btn-ghost btn-sm" title="Stock In" onClick={() => {
            setSelected(r); setStockType('in'); setStockForm({ quantity: '', unitCost: r.costPrice, reason: '', reference: '' }); setStockOpen(true);
          }}><ArrowDownToLine size={16} /></button>
          <button type="button" className="btn btn-ghost btn-sm" title="Stock Out" onClick={() => {
            setSelected(r); setStockType('out'); setStockForm({ quantity: '', unitCost: '', reason: '', reference: '' }); setStockOpen(true);
          }}><ArrowUpFromLine size={16} /></button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
            setEditing(r);
            setForm({
              name: r.name, sku: r.sku, category: r.category, quantity: r.quantity, unit: r.unit,
              costPrice: r.costPrice, sellingPrice: r.sellingPrice, reorderLevel: r.reorderLevel, description: r.description || '',
            });
            setModalOpen(true);
          }}><Pencil size={16} /></button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteId(r._id)}><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Materials, stock movements and valuation"
        actions={<button type="button" className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true); }}>
          <Plus size={16} /> Add Material
        </button>}
      />
      <div className="stat-grid">
        <StatCard label="Inventory Value" value={formatCurrency(valuation)} />
        <StatCard label="Low Stock Alerts" value={lowStockCount} />
        <StatCard label="Materials" value={pagination.total || rows.length} />
      </div>
      <div className="tabs">
        <button type="button" className={`tab ${tab === 'materials' ? 'active' : ''}`} onClick={() => setTab('materials')}>Materials</button>
        <button type="button" className={`tab ${tab === 'movements' ? 'active' : ''}`} onClick={() => setTab('movements')}>Stock History</button>
      </div>

      {tab === 'materials' && (
        <>
          <div className="toolbar">
            <div className="toolbar-left">
              <input className="search-input" placeholder="Search materials..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={lowStock} onChange={(e) => { setPage(1); setLowStock(e.target.checked); }} />
                Low stock only
              </label>
            </div>
          </div>
          {loading ? <LoadingSpinner /> : <DataTable columns={columns} rows={rows} pagination={pagination} onPageChange={setPage} emptyTitle="No materials" />}
        </>
      )}

      {tab === 'movements' && (
        loading ? <LoadingSpinner /> : (
          <DataTable
            columns={[
              { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
              { key: 'material', label: 'Material', render: (r) => r.material?.name },
              { key: 'type', label: 'Type', render: (r) => r.type.toUpperCase() },
              { key: 'quantity', label: 'Qty', render: (r) => formatNumber(r.quantity) },
              { key: 'previousQuantity', label: 'Before' },
              { key: 'newQuantity', label: 'After' },
              { key: 'reason', label: 'Reason', render: (r) => r.reason || r.reference || '—' },
            ]}
            rows={movements}
            emptyTitle="No stock movements"
          />
        )
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Material' : 'Add Material'} onClose={() => setModalOpen(false)}
        footer={<>
          <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          <button type="submit" form="mat-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}
      >
        <form id="mat-form" className="form-grid" onSubmit={handleSave}>
          <div className="form-group"><label>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label>SKU *</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} disabled={!!editing} /></div>
          <div className="form-group"><label>Category *</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div className="form-group"><label>Unit</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
          {!editing && <div className="form-group"><label>Opening Qty</label><input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>}
          <div className="form-group"><label>Cost Price *</label><input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></div>
          <div className="form-group"><label>Selling Price</label><input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} /></div>
          <div className="form-group"><label>Reorder Level</label><input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></div>
          <div className="form-group full"><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </form>
      </Modal>

      <Modal open={stockOpen} title={`${stockType === 'in' ? 'Stock In' : 'Stock Out'} – ${selected?.name || ''}`} onClose={() => setStockOpen(false)}
        footer={<>
          <button type="button" className="btn btn-outline" onClick={() => setStockOpen(false)}>Cancel</button>
          <button type="submit" form="stock-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Confirm'}</button>
        </>}
      >
        <form id="stock-form" className="form-grid" onSubmit={handleStock}>
          <div className="form-group"><label>Quantity *</label><input type="number" min="0" step="0.01" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} /></div>
          {stockType === 'in' && <div className="form-group"><label>Unit Cost</label><input type="number" min="0" step="0.01" value={stockForm.unitCost} onChange={(e) => setStockForm({ ...stockForm, unitCost: e.target.value })} /></div>}
          <div className="form-group"><label>Reference</label><input value={stockForm.reference} onChange={(e) => setStockForm({ ...stockForm, reference: e.target.value })} /></div>
          <div className="form-group full"><label>Reason</label><input value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} /></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Deactivate Material" message="Deactivate this material?" onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
