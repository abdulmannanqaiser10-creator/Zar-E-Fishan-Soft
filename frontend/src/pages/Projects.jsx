import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, clientsAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate, projectStatuses } from '../utils/format';

const STATUS_OPTIONS =
  projectStatuses ?? ['Planning', 'In Progress', 'On Hold', 'Completed'];

const emptyForm = () => ({
  name: '',
  client: '',
  budget: '',
  startDate: '',
  endDate: '',
  status: 'Planning',
  description: '',
  location: '',
});

function toInputDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function Projects() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clients, setClients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadClients = useCallback(() => {
    clientsAPI
      .list({ limit: 500, page: 1 })
      .then((res) => setClients(res.data.data || []))
      .catch(() => toast.error('Failed to load clients for dropdown'));
  }, []);

  const loadProjects = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.status = statusFilter;
    projectsAPI
      .list(params)
      .then((res) => {
        setRows(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((err) =>
        toast.error(err.response?.data?.message || 'Failed to load projects'),
      )
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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

  const openEdit = (project) => {
    setEditing(project);
    setForm({
      name: project.name || '',
      client: project.client?._id || project.client || '',
      budget: project.budget != null ? String(project.budget) : '',
      startDate: toInputDate(project.startDate),
      endDate: toInputDate(project.endDate),
      status: project.status || 'Planning',
      description: project.description || '',
      location: project.location || '',
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
      toast.error('Project name is required');
      return false;
    }
    if (!form.client) {
      toast.error('Client is required');
      return false;
    }
    if (form.budget === '' || Number(form.budget) < 0) {
      toast.error('Valid budget is required');
      return false;
    }
    if (!form.startDate) {
      toast.error('Start date is required');
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
      client: form.client,
      budget: Number(form.budget),
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      status: form.status,
      description: form.description.trim(),
      location: form.location.trim(),
    };
    try {
      if (editing) {
        await projectsAPI.update(editing._id, payload);
        toast.success('Project updated');
      } else {
        await projectsAPI.create(payload);
        toast.success('Project created');
      }
      closeModal();
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectsAPI.remove(deleteTarget._id);
      toast.success('Project deleted');
      setDeleteTarget(null);
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'projectId', label: 'ID', width: '110px' },
    {
      key: 'name',
      label: 'Project',
      render: (row) => (
        <Link to={`/projects/${row._id}`} style={{ display: 'block' }}>
          <strong style={{ color: 'var(--olive)' }}>{row.name}</strong>
          {row.location && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.location}</div>
          )}
        </Link>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (row) => row.client?.name || '—',
    },
    {
      key: 'budget',
      label: 'Budget',
      render: (row) => formatCurrency(row.budget),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'dates',
      label: 'Timeline',
      render: (row) => (
        <span style={{ fontSize: '0.85rem' }}>
          {formatDate(row.startDate)}
          {row.endDate ? ` → ${formatDate(row.endDate)}` : ''}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '130px',
      render: (row) => (
        <div className="actions">
          <Link to={`/projects/${row._id}`} className="btn btn-outline btn-sm" title="View">
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
        title="Projects"
        subtitle="Manage client projects, budgets and timelines"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} style={{ marginRight: 6 }} />
            New Project
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
                placeholder="Search by name or ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ paddingLeft: 34, width: '100%' }}
              />
            </div>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="toolbar-right" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {pagination.total != null ? `${pagination.total} project(s)` : null}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading projects..." />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No projects found"
            emptyDescription="Create a project or adjust your filters."
            pagination={pagination}
            onPageChange={setPage}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Project' : 'New Project'}
        onClose={closeModal}
        large
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="project-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="project-form" onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="project-name">Project name *</label>
              <input
                id="project-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="project-client">Client *</label>
              <select
                id="project-client"
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
              <label htmlFor="project-budget">Budget (PKR) *</label>
              <input
                id="project-budget"
                type="number"
                min="0"
                step="1"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="project-start">Start date *</label>
              <input
                id="project-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="project-end">End date</label>
              <input
                id="project-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="project-status">Status</label>
              <select
                id="project-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="project-location">Location</label>
              <input
                id="project-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="form-group full">
              <label htmlFor="project-description">Description</label>
              <textarea
                id="project-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete project"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}