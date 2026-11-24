import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Eye, Search, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsAPI, erpAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/format';

const CRM_STATUSES = ['Lead', 'Follow-up', 'Closed', 'Client'];

const emptyForm = () => ({
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  notes: '',
  crmStatus: 'Lead',
  source: '',
});

const emptyFollowUp = () => ({ note: '', nextFollowUp: '', crmStatus: '' });

export default function CRM() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [crmFilter, setCrmFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [followClient, setFollowClient] = useState(null);
  const [followForm, setFollowForm] = useState(emptyFollowUp());
  const [followSaving, setFollowSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (search.trim()) params.search = search.trim();
    if (crmFilter) params.crmStatus = crmFilter;
    clientsAPI
      .list(params)
      .then((res) => {
        setRows(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load CRM'))
      .finally(() => setLoading(false));
  }, [page, search, crmFilter]);

  useEffect(() => {
    load();
  }, [load]);

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
      crmStatus: client.crmStatus || 'Client',
      source: client.source || '',
    });
    setModalOpen(true);
  };

  const saveClient = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      notes: form.notes.trim(),
      crmStatus: form.crmStatus,
      source: form.source.trim(),
    };
    try {
      if (editing) {
        await clientsAPI.update(editing._id, payload);
        toast.success('Contact updated');
      } else {
        await clientsAPI.create(payload);
        toast.success('Contact created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const openFollowUp = (client) => {
    setFollowClient(client);
    setFollowForm({ note: '', nextFollowUp: '', crmStatus: client.crmStatus || '' });
  };

  const submitFollowUp = async (e) => {
    e.preventDefault();
    if (!followForm.note.trim()) {
      toast.error('Note is required');
      return;
    }
    setFollowSaving(true);
    try {
      await erpAPI.addFollowUp(followClient._id, {
        note: followForm.note.trim(),
        nextFollowUp: followForm.nextFollowUp || undefined,
        crmStatus: followForm.crmStatus || undefined,
      });
      toast.success('Follow-up logged');
      setFollowClient(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Follow-up failed');
    } finally {
      setFollowSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Contact',
      render: (row) => (
        <div>
          <strong style={{ color: 'var(--olive)' }}>{row.name}</strong>
          {row.city && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.city}</div>}
        </div>
      ),
    },
    {
      key: 'crmStatus',
      label: 'CRM status',
      render: (row) => <StatusBadge status={row.crmStatus || 'Client'} />,
    },
    { key: 'phone', label: 'Phone' },
    {
      key: 'nextFollow',
      label: 'Last follow-up',
      render: (row) => {
        const fu = row.followUps?.length ? row.followUps[row.followUps.length - 1] : null;
        return fu ? formatDate(fu.date || fu.createdAt) : '—';
      },
    },
    {
      key: 'pending',
      label: 'Pending',
      render: (row) => formatCurrency(row.totalPending),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      render: (row) => (
        <div className="actions">
          <button type="button" className="btn btn-gold btn-sm" title="Follow-up" onClick={() => openFollowUp(row)}>
            <MessageSquare size={14} />
          </button>
          <Link to={`/clients/${row._id}`} className="btn btn-outline btn-sm" title="View">
            <Eye size={14} />
          </Link>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(row)} title="Edit">
            <Pencil size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle="Leads, follow-ups, and client pipeline"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} style={{ marginRight: 6 }} />
            New lead
          </button>
        }
      />

      <div className="card">
        <div className="toolbar" style={{ marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              className="search-input"
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: 34, width: '100%' }}
            />
          </div>
          <select className="filter-select" value={crmFilter} onChange={(e) => { setCrmFilter(e.target.value); setPage(1); }}>
            <option value="">All CRM statuses</option>
            {CRM_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading CRM..." />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No contacts"
            emptyDescription="Add a lead or adjust filters."
            pagination={pagination}
            onPageChange={setPage}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit contact' : 'New lead'}
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="submit" form="crm-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form id="crm-form" onSubmit={saveClient}>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>CRM status</label>
              <select value={form.crmStatus} onChange={(e) => setForm((f) => ({ ...f, crmStatus: e.target.value }))}>
                {CRM_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Source</label>
              <input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="Referral, website..." />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>City</label>
              <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!followClient}
        title={`Follow-up — ${followClient?.name || ''}`}
        onClose={() => !followSaving && setFollowClient(null)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setFollowClient(null)} disabled={followSaving}>Cancel</button>
            <button type="submit" form="follow-form" className="btn btn-primary" disabled={followSaving}>
              {followSaving ? 'Saving...' : 'Log follow-up'}
            </button>
          </>
        }
      >
        <form id="follow-form" onSubmit={submitFollowUp}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Note *</label>
              <textarea rows={3} value={followForm.note} onChange={(e) => setFollowForm((f) => ({ ...f, note: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Next follow-up date</label>
              <input type="date" value={followForm.nextFollowUp} onChange={(e) => setFollowForm((f) => ({ ...f, nextFollowUp: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Update CRM status</label>
              <select value={followForm.crmStatus} onChange={(e) => setFollowForm((f) => ({ ...f, crmStatus: e.target.value }))}>
                <option value="">Keep current</option>
                {CRM_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}