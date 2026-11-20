import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/format';

const emptyForm = () => ({
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  notes: '',
});

export default function Clients() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadClients = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (search.trim()) params.search = search.trim();
    clientsAPI
      .list(params)
      .then((res) => {
        setRows(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((err) =>
        toast.error(err.response?.data?.message || 'Failed to load clients'),
      )
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (client) => {
    setEditing(client);
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      notes: client.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return false;
    }
    if (!form.phone.trim()) {
      toast.error('Phone is required');
      return false;
    }
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      notes: form.notes.trim(),
    };
    try {
      if (editing) {
        await clientsAPI.update(editing._id, payload);
        toast.success('Client updated');
      } else {
        await clientsAPI.create(payload);
        toast.success('Client created');
      }
      closeModal();
      loadClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await clientsAPI.remove(deleteTarget._id);
      toast.success('Client deleted');
      setDeleteTarget(null);
      loadClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete client');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Client',
      render: (row) => (
        <div>
          <strong style={{ color: 'var(--olive)' }}>{row.name}</strong>
          {row.city && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.city}</div>
          )}
        </div>
      ),
    },
    { key: 'phone', label: 'Phone' },
    {
      key: 'email',
      label: 'Email',
      render: (row) => row.email || '—',
    },
    {
      key: 'totalProjectValue',
      label: 'Project value',
      render: (row) => formatCurrency(row.totalProjectValue),
    },
    {
      key: 'totalPaid',
      label: 'Paid',
      render: (row) => (
        <span style={{ color: 'var(--success)' }}>{formatCurrency(row.totalPaid)}</span>
      ),
    },
    {
      key: 'totalPending',
      label: 'Pending',
      render: (row) => (
        <span style={{ color: row.totalPending > 0 ? 'var(--danger)' : undefined }}>
          {formatCurrency(row.totalPending)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '130px',
      render: (row) => (
        <div className="actions">
          <Link to={`/clients/${row._id}`} className="btn btn-outline btn-sm" title="View">
            <Eye size={14} />
          </Link>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(row)} title="Edit">
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setDeleteTarget(row)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Customer directory and account balances"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} style={{ marginRight: 6 }} />
            New Client
          </button>
        }
      />

      <div className="card">
        <div className="toolbar" style={{ marginBottom: '1rem' }}>
          <div className="toolbar-left">
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="search"
                className="search-input"
                placeholder="Search name, phone, email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ paddingLeft: 34, width: '100%' }}
              />
            </div>
          </div>
          <div className="toolbar-right" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {pagination.total != null ? `${pagination.total} client(s)` : null}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading clients..." />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No clients found"
            emptyDescription="Add a client to get started."
            pagination={pagination}
            onPageChange={setPage}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Client' : 'New Client'}
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="client-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="client-form" onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="client-name">Name *</label>
              <input
                id="client-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="client-phone">Phone *</label>
              <input
                id="client-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="client-email">Email</label>
              <input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="client-city">City</label>
              <input
                id="client-city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="form-group full">
              <label htmlFor="client-address">Address</label>
              <input
                id="client-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="form-group full">
              <label htmlFor="client-notes">Notes</label>
              <textarea
                id="client-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete client"
        message={`Delete "${deleteTarget?.name}"? Clients with projects cannot be deleted.`}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}