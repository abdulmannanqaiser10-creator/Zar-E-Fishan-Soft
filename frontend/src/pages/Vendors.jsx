import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { vendorsAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/format';

const emptyForm = { name: '', contactPerson: '', phone: '', email: '', address: '', category: 'General', notes: '' };

export default function Vendors() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorsAPI.list({ search, page, limit: 10 });
      setRows(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error('Name and phone are required');
    setSaving(true);
    try {
      if (editing) await vendorsAPI.update(editing._id, form);
      else await vendorsAPI.create(form);
      toast.success(editing ? 'Vendor updated' : 'Vendor created');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await vendorsAPI.remove(deleteId);
      toast.success('Vendor deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <PageHeader title="Vendors" subtitle="Supplier contacts and purchase balances"
        actions={<button type="button" className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true); }}>
          <Plus size={16} /> Add Vendor
        </button>}
      />
      <div className="toolbar">
        <input className="search-input" placeholder="Search vendors..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
      </div>
      {loading ? <LoadingSpinner /> : (
        <DataTable
          columns={[
            { key: 'name', label: 'Name', render: (r) => <strong>{r.name}</strong> },
            { key: 'contactPerson', label: 'Contact', render: (r) => r.contactPerson || '—' },
            { key: 'phone', label: 'Phone' },
            { key: 'category', label: 'Category' },
            { key: 'totalPurchases', label: 'Purchases', render: (r) => formatCurrency(r.totalPurchases) },
            { key: 'totalOutstanding', label: 'Outstanding', render: (r) => formatCurrency(r.totalOutstanding) },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <div className="actions">
                  <Link to={`/vendors/${r._id}`} className="btn btn-ghost btn-sm"><Eye size={16} /></Link>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                    setEditing(r);
                    setForm({
                      name: r.name, contactPerson: r.contactPerson || '', phone: r.phone,
                      email: r.email || '', address: r.address || '', category: r.category || 'General', notes: r.notes || '',
                    });
                    setModalOpen(true);
                  }}><Pencil size={16} /></button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteId(r._id)}><Trash2 size={16} /></button>
                </div>
              ),
            },
          ]}
          rows={rows}
          pagination={pagination}
          onPageChange={setPage}
          emptyTitle="No vendors"
        />
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Vendor' : 'New Vendor'} onClose={() => setModalOpen(false)}
        footer={<>
          <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          <button type="submit" form="vendor-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}
      >
        <form id="vendor-form" className="form-grid" onSubmit={handleSave}>
          <div className="form-group"><label>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label>Contact Person</label><input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
          <div className="form-group"><label>Phone *</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="form-group"><label>Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div className="form-group full"><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="form-group full"><label>Notes</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Vendor" message="Delete this vendor?" onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
