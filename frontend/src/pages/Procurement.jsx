import { useCallback, useEffect, useState } from 'react';
import { Plus, CheckCircle2, Banknote, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementAPI, vendorsAPI, projectsAPI, inventoryAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate, poStatuses, paymentMethods } from '../utils/format';

export default function Procurement() {
  const [tab, setTab] = useState('orders');
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payables, setPayables] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prOpen, setPrOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [saving, setSaving] = useState(false);
  const [prForm, setPrForm] = useState({
    project: '', priority: 'Medium', notes: '',
    items: [{ material: '', description: '', quantity: 1, estimatedUnitPrice: 0 }],
  });
  const [poForm, setPoForm] = useState({
    vendor: '', project: '', taxRate: 5, discountAmount: 0, expectedDate: '', notes: '',
    items: [{ material: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
  });
  const [payment, setPayment] = useState({ amount: '', method: 'bank_transfer', date: new Date().toISOString().slice(0, 10), reference: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'requests') {
        const res = await procurementAPI.requests({ limit: 50 });
        setRequests(res.data.data);
      } else if (tab === 'orders') {
        const res = await procurementAPI.orders({ limit: 50 });
        setOrders(res.data.data);
      } else {
        const res = await procurementAPI.payables();
        setPayables(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    Promise.all([
      vendorsAPI.list({ limit: 100 }),
      projectsAPI.list({ limit: 100 }),
      inventoryAPI.list({ limit: 200 }),
    ]).then(([v, p, m]) => {
      setVendors(v.data.data);
      setProjects(p.data.data);
      setMaterials(m.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const createPR = async (e) => {
    e.preventDefault();
    if (!prForm.items[0]?.description && !prForm.items[0]?.material) {
      return toast.error('Add at least one item');
    }
    setSaving(true);
    try {
      const items = prForm.items.map((i) => {
        const mat = materials.find((m) => m._id === i.material);
        return {
          material: i.material || undefined,
          description: i.description || mat?.name || 'Item',
          quantity: Number(i.quantity) || 0,
          estimatedUnitPrice: Number(i.estimatedUnitPrice) || mat?.costPrice || 0,
        };
      });
      await procurementAPI.createRequest({ ...prForm, project: prForm.project || undefined, items });
      toast.success('Purchase request created');
      setPrOpen(false);
      setTab('requests');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const updatePRStatus = async (id, status) => {
    try {
      await procurementAPI.updateRequest(id, { status });
      toast.success(`Request ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const createPO = async (e) => {
    e.preventDefault();
    if (!poForm.vendor || !poForm.items[0]?.material) {
      return toast.error('Vendor and materials are required');
    }
    setSaving(true);
    try {
      await procurementAPI.createOrder({
        ...poForm,
        project: poForm.project || undefined,
        taxRate: Number(poForm.taxRate) || 0,
        discountAmount: Number(poForm.discountAmount) || 0,
        items: poForm.items.map((i) => ({
          material: i.material,
          quantity: Number(i.quantity) || 0,
          unitPrice: Number(i.unitPrice) || 0,
          taxRate: Number(i.taxRate) || 0,
        })),
      });
      toast.success('Purchase order created');
      setPoOpen(false);
      setTab('orders');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const updatePOStatus = async (id, status) => {
    try {
      await procurementAPI.updateOrder(id, { status });
      toast.success(`PO marked ${status}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const receivePO = async (id) => {
    try {
      await procurementAPI.receiveOrder(id);
      toast.success('PO received — inventory updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Receive failed');
    }
  };

  const payPO = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await procurementAPI.payOrder(selectedPO._id, { ...payment, amount: Number(payment.amount) });
      toast.success('Vendor payment recorded');
      setPayOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Procurement" subtitle="Purchase requests, orders and receiving"
        actions={
          <div className="toolbar-right">
            <button type="button" className="btn btn-outline" onClick={() => setPrOpen(true)}><Plus size={16} /> Request</button>
            <button type="button" className="btn btn-primary" onClick={() => setPoOpen(true)}><Plus size={16} /> Purchase Order</button>
          </div>
        }
      />
      <div className="tabs">
        {['orders', 'requests', 'payables'].map((t) => (
          <button key={t} type="button" className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'orders' ? 'Purchase Orders' : t === 'requests' ? 'Purchase Requests' : 'Payables'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : tab === 'orders' ? (
        <DataTable
          columns={[
            { key: 'poNumber', label: 'PO #' },
            { key: 'vendor', label: 'Vendor', render: (r) => r.vendor?.name },
            { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
            { key: 'remainingBalance', label: 'Balance', render: (r) => formatCurrency(r.remainingBalance) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'orderDate', label: 'Date', render: (r) => formatDate(r.orderDate) },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <div className="actions">
                  {['Pending', 'Approved'].includes(r.status) && (
                    <select className="filter-select" style={{ minWidth: 110 }} value={r.status}
                      onChange={(e) => updatePOStatus(r._id, e.target.value)}>
                      {poStatuses.filter((s) => s !== 'Received').map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  {r.status !== 'Received' && r.status !== 'Cancelled' && (
                    <button type="button" className="btn btn-ghost btn-sm" title="Receive" onClick={() => receivePO(r._id)}>
                      <PackageCheck size={16} />
                    </button>
                  )}
                  {r.remainingBalance > 0 && r.status !== 'Cancelled' && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                      setSelectedPO(r);
                      setPayment({ amount: r.remainingBalance, method: 'bank_transfer', date: new Date().toISOString().slice(0, 10), reference: '' });
                      setPayOpen(true);
                    }}><Banknote size={16} /></button>
                  )}
                </div>
              ),
            },
          ]}
          rows={orders}
          emptyTitle="No purchase orders"
        />
      ) : tab === 'requests' ? (
        <DataTable
          columns={[
            { key: 'requestNumber', label: 'PR #' },
            { key: 'project', label: 'Project', render: (r) => r.project?.name || '—' },
            { key: 'priority', label: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'requestedBy', label: 'Requested By', render: (r) => r.requestedBy?.name },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => r.status === 'Pending' ? (
                <div className="actions">
                  <button type="button" className="btn btn-gold btn-sm" onClick={() => updatePRStatus(r._id, 'Approved')}><CheckCircle2 size={14} /> Approve</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => updatePRStatus(r._id, 'Rejected')}>Reject</button>
                </div>
              ) : null,
            },
          ]}
          rows={requests}
          emptyTitle="No purchase requests"
        />
      ) : (
        <DataTable
          columns={[
            { key: 'poNumber', label: 'PO #' },
            { key: 'vendor', label: 'Vendor', render: (r) => r.vendor?.name },
            { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
            { key: 'remainingBalance', label: 'Outstanding', render: (r) => formatCurrency(r.remainingBalance) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={payables}
          emptyTitle="No payables"
        />
      )}

      <Modal open={prOpen} title="New Purchase Request" large onClose={() => setPrOpen(false)}
        footer={<>
          <button type="button" className="btn btn-outline" onClick={() => setPrOpen(false)}>Cancel</button>
          <button type="submit" form="pr-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
        </>}
      >
        <form id="pr-form" onSubmit={createPR}>
          <div className="form-grid">
            <div className="form-group"><label>Project</label>
              <select value={prForm.project} onChange={(e) => setPrForm({ ...prForm, project: e.target.value })}>
                <option value="">None</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Priority</label>
              <select value={prForm.priority} onChange={(e) => setPrForm({ ...prForm, priority: e.target.value })}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
          </div>
          {prForm.items.map((item, idx) => (
            <div key={idx} className="form-grid" style={{ marginTop: '0.5rem' }}>
              <div className="form-group"><label>Material</label>
                <select value={item.material} onChange={(e) => {
                  const items = [...prForm.items];
                  const mat = materials.find((m) => m._id === e.target.value);
                  items[idx] = { ...items[idx], material: e.target.value, description: mat?.name || '', estimatedUnitPrice: mat?.costPrice || 0 };
                  setPrForm({ ...prForm, items });
                }}>
                  <option value="">Select</option>
                  {materials.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Qty</label><input type="number" min="0" value={item.quantity} onChange={(e) => {
                const items = [...prForm.items]; items[idx].quantity = e.target.value; setPrForm({ ...prForm, items });
              }} /></div>
            </div>
          ))}
          <div className="form-group" style={{ marginTop: '0.75rem' }}><label>Notes</label>
            <textarea rows={2} value={prForm.notes} onChange={(e) => setPrForm({ ...prForm, notes: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal open={poOpen} title="New Purchase Order" large onClose={() => setPoOpen(false)}
        footer={<>
          <button type="button" className="btn btn-outline" onClick={() => setPoOpen(false)}>Cancel</button>
          <button type="submit" form="po-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
        </>}
      >
        <form id="po-form" onSubmit={createPO}>
          <div className="form-grid">
            <div className="form-group"><label>Vendor *</label>
              <select value={poForm.vendor} onChange={(e) => setPoForm({ ...poForm, vendor: e.target.value })}>
                <option value="">Select</option>
                {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Project</label>
              <select value={poForm.project} onChange={(e) => setPoForm({ ...poForm, project: e.target.value })}>
                <option value="">None</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Tax %</label><input type="number" min="0" value={poForm.taxRate} onChange={(e) => setPoForm({ ...poForm, taxRate: e.target.value })} /></div>
            <div className="form-group"><label>Discount</label><input type="number" min="0" value={poForm.discountAmount} onChange={(e) => setPoForm({ ...poForm, discountAmount: e.target.value })} /></div>
            <div className="form-group"><label>Expected Date</label><input type="date" value={poForm.expectedDate} onChange={(e) => setPoForm({ ...poForm, expectedDate: e.target.value })} /></div>
          </div>
          {poForm.items.map((item, idx) => (
            <div key={idx} className="form-grid" style={{ marginTop: '0.5rem' }}>
              <div className="form-group"><label>Material *</label>
                <select value={item.material} onChange={(e) => {
                  const items = [...poForm.items];
                  const mat = materials.find((m) => m._id === e.target.value);
                  items[idx] = { ...items[idx], material: e.target.value, unitPrice: mat?.costPrice || 0 };
                  setPoForm({ ...poForm, items });
                }}>
                  <option value="">Select</option>
                  {materials.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.sku})</option>)}
                </select>
              </div>
              <div className="form-group"><label>Qty</label><input type="number" min="0" value={item.quantity} onChange={(e) => {
                const items = [...poForm.items]; items[idx].quantity = e.target.value; setPoForm({ ...poForm, items });
              }} /></div>
              <div className="form-group"><label>Unit Price</label><input type="number" min="0" value={item.unitPrice} onChange={(e) => {
                const items = [...poForm.items]; items[idx].unitPrice = e.target.value; setPoForm({ ...poForm, items });
              }} /></div>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }}
            onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { material: '', quantity: 1, unitPrice: 0, taxRate: 0 }] })}>
            Add Item
          </button>
        </form>
      </Modal>

      <Modal open={payOpen} title={`Vendor Payment – ${selectedPO?.poNumber || ''}`} onClose={() => setPayOpen(false)}
        footer={<>
          <button type="button" className="btn btn-outline" onClick={() => setPayOpen(false)}>Cancel</button>
          <button type="submit" form="popay-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Pay'}</button>
        </>}
      >
        <form id="popay-form" className="form-grid" onSubmit={payPO}>
          <div className="form-group"><label>Amount *</label><input type="number" min="0" step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></div>
          <div className="form-group"><label>Method</label>
            <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
              {paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Date</label><input type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} /></div>
          <div className="form-group"><label>Reference</label><input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
