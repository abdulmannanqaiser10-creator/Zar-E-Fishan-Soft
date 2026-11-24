import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Briefcase,
  MapPin,
  Calendar,
  Upload,
  Image,
  Phone,
  Mail,
  User,
  Clock,
  FileText,
  CircleDollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, clientsAPI, erpAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import { formatCurrency, formatDate, formatDateTime, projectStatuses, paymentMethods } from '../utils/format';

const STATUS_OPTIONS = projectStatuses ?? ['Planning', 'In Progress', 'On Hold', 'Completed'];

const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'media', label: 'Media' },
  { id: 'finance', label: 'Finance' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'history', label: 'History' },
];

function toInputDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

const emptyProjectForm = () => ({
  name: '',
  client: '',
  budget: '',
  startDate: '',
  endDate: '',
  status: 'Planning',
  description: '',
  location: '',
  notes: '',
});

const emptyTaskForm = () => ({
  title: '',
  description: '',
  dueDate: '',
  status: 'todo',
});

const emptyExpenseForm = () => ({
  title: '',
  category: 'General',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'cash',
  notes: '',
});

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [tab, setTab] = useState('overview');

  const [editOpen, setEditOpen] = useState(false);
  const [projectForm, setProjectForm] = useState(emptyProjectForm());
  const [savingProject, setSavingProject] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm());
  const [savingTask, setSavingTask] = useState(false);
  const [taskDelete, setTaskDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState(null);

  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm());
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseDelete, setExpenseDelete] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  const loadProject = useCallback(() => {
    setLoading(true);
    projectsAPI
      .get(id)
      .then((res) => setProject(res.data.data))
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to load project');
        navigate('/projects');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    clientsAPI
      .list({ limit: 500, page: 1 })
      .then((res) => setClients(res.data.data || []))
      .catch(() => {});
  }, []);

  const summary = useMemo(() => project?.summary || {
    budget: project?.budget || 0,
    totalRevenue: project?.totalRevenue || 0,
    totalExpenses: project?.totalExpenses || 0,
    netProfit: (project?.totalRevenue || 0) - (project?.totalExpenses || 0),
    invoicePending: 0,
    budgetRemaining: Math.max(0, (project?.budget || 0) - (project?.totalExpenses || 0)),
  }, [project]);

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast.error('File must be under 12MB');
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await erpAPI.addProjectMedia(id, fd);
      toast.success('Media uploaded');
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeMedia = async (mediaId) => {
    setDeletingMediaId(mediaId);
    try {
      await erpAPI.deleteProjectMedia(id, mediaId);
      toast.success('Media removed');
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingMediaId(null);
    }
  };

  const submitProjectExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amount) {
      toast.error('Title and amount required');
      return;
    }
    setExpenseSaving(true);
    try {
      await erpAPI.addProjectExpense(id, {
        title: expenseForm.title.trim(),
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
        paymentMethod: expenseForm.paymentMethod,
        notes: expenseForm.notes,
      });
      toast.success('Project expense recorded');
      setExpenseForm(emptyExpenseForm());
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setExpenseSaving(false);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseDelete) return;
    setDeletingExpense(true);
    try {
      await erpAPI.deleteProjectExpense(id, expenseDelete._id);
      toast.success('Expense deleted');
      setExpenseDelete(null);
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDeletingExpense(false);
    }
  };

  const openEdit = () => {
    if (!project) return;
    setProjectForm({
      name: project.name || '',
      client: project.client?._id || project.client || '',
      budget: project.budget != null ? String(project.budget) : '',
      startDate: toInputDate(project.startDate),
      endDate: toInputDate(project.endDate),
      status: project.status || 'Planning',
      description: project.description || '',
      location: project.location || '',
      notes: project.notes || '',
    });
    setEditOpen(true);
  };

  const saveProject = async (e) => {
    e.preventDefault();
    if (!projectForm.name.trim() || !projectForm.client || !projectForm.startDate) {
      toast.error('Name, client and start date are required');
      return;
    }
    if (projectForm.budget === '' || Number(projectForm.budget) < 0) {
      toast.error('Valid budget is required');
      return;
    }
    setSavingProject(true);
    try {
      await projectsAPI.update(id, {
        name: projectForm.name.trim(),
        client: projectForm.client,
        budget: Number(projectForm.budget),
        startDate: projectForm.startDate,
        endDate: projectForm.endDate || undefined,
        status: projectForm.status,
        description: projectForm.description.trim(),
        location: projectForm.location.trim(),
        notes: projectForm.notes.trim(),
      });
      toast.success('Project updated');
      setEditOpen(false);
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSavingProject(false);
    }
  };

  const confirmDeleteProject = async () => {
    setDeletingProject(true);
    try {
      await projectsAPI.remove(id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeletingProject(false);
      setDeleteProjectOpen(false);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    setSavingTask(true);
    try {
      await projectsAPI.addTask(id, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        dueDate: taskForm.dueDate || undefined,
        status: taskForm.status,
      });
      toast.success('Task added');
      setTaskModalOpen(false);
      setTaskForm(emptyTaskForm());
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add task');
    } finally {
      setSavingTask(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    setUpdatingTaskId(taskId);
    try {
      await projectsAPI.updateTask(id, taskId, { status });
      toast.success('Task updated');
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const deleteTaskConfirm = async () => {
    if (!taskDelete) return;
    setDeletingTask(true);
    try {
      await projectsAPI.deleteTask(id, taskDelete._id);
      toast.success('Task deleted');
      setTaskDelete(null);
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    } finally {
      setDeletingTask(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading project..." />;
  if (!project) return null;

  const tasks = project.tasks || [];
  const transactions = project.transactions || [];
  const invoices = project.invoices || [];
  const activities = project.activities || [];
  const media = project.media || [];
  const projectExpenses = project.projectExpenses || [];
  const payments = transactions.filter((t) => t.type === 'income');
  const client = project.client;

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'issueDate', label: 'Date', render: (r) => formatDate(r.issueDate) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'paidAmount', label: 'Paid', render: (r) => formatCurrency(r.paidAmount) },
    {
      key: 'remainingBalance',
      label: 'Pending',
      render: (r) => (
        <span style={{ color: r.remainingBalance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 650 }}>
          {formatCurrency(r.remainingBalance)}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const paymentColumns = [
    { key: 'transactionId', label: 'ID' },
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'category', label: 'Category' },
    { key: 'paymentMethod', label: 'Method', render: (r) => String(r.paymentMethod || '').replace(/_/g, ' ') },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => <span style={{ color: 'var(--success)', fontWeight: 700 }}>+{formatCurrency(r.amount)}</span>,
    },
  ];

  const txnColumns = [
    { key: 'transactionId', label: 'ID' },
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'category', label: 'Category' },
    { key: 'type', label: 'Type', render: (r) => <StatusBadge status={r.type} /> },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span style={{ color: r.type === 'income' ? 'var(--success)' : 'var(--danger)', fontWeight: 650 }}>
          {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
            <span>{project.projectId}</span>
            <StatusBadge status={project.status} />
            {client && (
              <Link to={`/clients/${client._id}`} style={{ color: 'var(--gold-dark)', fontWeight: 650 }}>
                {client.name}
              </Link>
            )}
          </span>
        }
        actions={
          <>
            <Link to="/projects" className="btn btn-outline">
              <ArrowLeft size={16} /> Back
            </Link>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteProjectOpen(true)}>
              <Trash2 size={14} /> Delete
            </button>
            <button type="button" className="btn btn-primary" onClick={openEdit}>
              <Pencil size={16} /> Edit / Update
            </button>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard label="Total Budget" value={formatCurrency(summary.budget)} icon={Wallet} />
        <StatCard label="Payments / Revenue" value={formatCurrency(summary.totalRevenue)} icon={TrendingUp} />
        <StatCard label="Total Expenses" value={formatCurrency(summary.totalExpenses)} icon={TrendingDown} />
        <StatCard label="Net Profit" value={formatCurrency(summary.netProfit)} icon={CircleDollarSign} />
        <StatCard label="Invoice Pending" value={formatCurrency(summary.invoicePending)} icon={FileText} />
        <StatCard label="Budget Remaining" value={formatCurrency(summary.budgetRemaining)} icon={Briefcase} />
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
          <div className="card">
            <h3 className="section-title">Project information</h3>
            <div style={{ display: 'grid', gap: '0.85rem', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Calendar size={16} style={{ opacity: 0.6 }} />
                <span>
                  {formatDate(project.startDate)}
                  {project.endDate ? ` — ${formatDate(project.endDate)}` : ' — Ongoing'}
                </span>
              </div>
              {project.location && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <MapPin size={16} style={{ opacity: 0.6 }} />
                  <span>{project.location}</span>
                </div>
              )}
              <div>
                <strong style={{ color: 'var(--olive)' }}>Description</strong>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                  {project.description || 'No description added yet.'}
                </p>
              </div>
              {project.notes && (
                <div>
                  <strong style={{ color: 'var(--olive)' }}>Notes</strong>
                  <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>{project.notes}</p>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span>Progress</span>
                <strong>{project.progress ?? 0}%</strong>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'var(--cream-dark)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, project.progress || 0))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--olive), var(--gold))',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">Client details</h3>
            {client ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
                  <User size={16} style={{ opacity: 0.65 }} />
                  <Link to={`/clients/${client._id}`} style={{ fontWeight: 700, color: 'var(--olive)' }}>
                    {client.name}
                  </Link>
                </div>
                {client.phone && (
                  <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
                    <Phone size={16} style={{ opacity: 0.65 }} />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
                    <Mail size={16} style={{ opacity: 0.65 }} />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start' }}>
                    <MapPin size={16} style={{ opacity: 0.65, marginTop: 2 }} />
                    <span>{client.address}{client.city ? `, ${client.city}` : ''}</span>
                  </div>
                )}
                <div className="stat-grid" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                  <StatCard label="Client paid" value={formatCurrency(client.totalPaid)} />
                  <StatCard label="Client pending" value={formatCurrency(client.totalPending)} />
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No client linked</p>
            )}
          </div>
        </div>
      )}

      {tab === 'media' && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Images & videos</h3>
            <label className="btn btn-gold btn-sm" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Add media'}
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} disabled={uploading} onChange={handleMediaUpload} />
            </label>
          </div>
          {media.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No media yet. Upload project pictures or videos.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {media.map((m) => (
                <div key={m._id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
                  {m.type === 'video' ? (
                    <video src={m.url} style={{ width: '100%', height: 150, objectFit: 'cover' }} controls />
                  ) : (
                    <img src={m.url} alt={m.name} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                  )}
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ position: 'absolute', top: 8, right: 8 }}
                    disabled={deletingMediaId === m._id}
                    onClick={() => removeMedia(m._id)}
                  >
                    <Trash2 size={12} />
                  </button>
                  <div style={{ padding: '0.45rem 0.6rem', fontSize: '0.75rem', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Image size={12} /> {m.name || m.type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'finance' && (
        <>
          <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
            <div className="card">
              <h3 className="section-title">Add project expense</h3>
              <form onSubmit={submitProjectExpense}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Title *</label>
                    <input value={expenseForm.title} onChange={(e) => setExpenseForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Amount *</label>
                    <input type="number" min="1" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Payment method</label>
                    <select value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                      {paymentMethods.map((pm) => (
                        <option key={pm.value} value={pm.value}>{pm.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Notes</label>
                    <textarea rows={2} value={expenseForm.notes} onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={expenseSaving} style={{ marginTop: '0.65rem' }}>
                  {expenseSaving ? 'Saving…' : (<><Plus size={14} /> Record expense</>)}
                </button>
              </form>
            </div>

            <div className="card">
              <h3 className="section-title">Project expenses</h3>
              {projectExpenses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No dedicated project expenses yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {projectExpenses.map((pe) => (
                    <div key={pe._id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.55rem' }}>
                      <div>
                        <strong>{pe.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {pe.category} · {formatDate(pe.date)} · {String(pe.paymentMethod || '').replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatCurrency(pe.amount)}</span>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setExpenseDelete(pe)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Client invoices</h3>
              <Link to="/finance/invoices" className="btn btn-outline btn-sm">Manage invoices</Link>
            </div>
            <DataTable columns={invoiceColumns} rows={invoices} emptyTitle="No invoices for this project" />
          </div>

          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h3 className="section-title">Payments received</h3>
            <DataTable columns={paymentColumns} rows={payments} emptyTitle="No payments recorded" />
          </div>

          <div className="card">
            <h3 className="section-title">All linked transactions</h3>
            <DataTable columns={txnColumns} rows={transactions} emptyTitle="No transactions" emptyDescription="Income and expenses linked to this project appear here." />
          </div>
        </>
      )}

      {tab === 'tasks' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Tasks & progress</h3>
            <button type="button" className="btn btn-gold btn-sm" onClick={() => { setTaskForm(emptyTaskForm()); setTaskModalOpen(true); }}>
              <Plus size={14} /> Add task
            </button>
          </div>
          {tasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No tasks yet. Add tasks to drive automatic progress.</p>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Progress is calculated from completed tasks ({tasks.filter((t) => t.status === 'done').length}/{tasks.length}).
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {tasks.map((task) => (
              <div key={task._id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 650, color: 'var(--olive)' }}>{task.title}</div>
                  {task.description && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{task.description}</div>}
                  {task.dueDate && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due {formatDate(task.dueDate)}</div>}
                </div>
                <select
                  className="filter-select"
                  value={task.status}
                  disabled={updatingTaskId === task._id}
                  onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                  style={{ minWidth: 130 }}
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setTaskDelete(task)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <h3 className="section-title">Complete project history</h3>
          {activities.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {activities.map((a) => (
                <div key={a._id} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <Clock size={15} style={{ marginTop: 3, opacity: 0.55 }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--olive)' }}>{a.description}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {a.user?.name || 'System'} · {formatDateTime(a.createdAt)} · {a.action}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No activity recorded yet.</p>
          )}
        </div>
      )}

      <Modal
        open={editOpen}
        title="Edit / Update project"
        onClose={() => !savingProject && setEditOpen(false)}
        large
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setEditOpen(false)} disabled={savingProject}>Cancel</button>
            <button type="submit" form="detail-project-form" className="btn btn-primary" disabled={savingProject}>
              {savingProject ? 'Saving…' : 'Update project'}
            </button>
          </>
        }
      >
        <form id="detail-project-form" onSubmit={saveProject}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Project name *</label>
              <input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Client *</label>
              <select value={projectForm.client} onChange={(e) => setProjectForm((f) => ({ ...f, client: e.target.value }))} required>
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Budget *</label>
              <input type="number" min="0" value={projectForm.budget} onChange={(e) => setProjectForm((f) => ({ ...f, budget: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Start date *</label>
              <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((f) => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>End date</label>
              <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={projectForm.status} onChange={(e) => setProjectForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={projectForm.location} onChange={(e) => setProjectForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label>Description</label>
              <textarea rows={3} value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label>Notes</label>
              <textarea rows={2} value={projectForm.notes} onChange={(e) => setProjectForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={taskModalOpen}
        title="Add task"
        onClose={() => !savingTask && setTaskModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setTaskModalOpen(false)} disabled={savingTask}>Cancel</button>
            <button type="submit" form="add-task-form" className="btn btn-primary" disabled={savingTask}>
              {savingTask ? 'Adding…' : 'Add task'}
            </button>
          </>
        }
      >
        <form id="add-task-form" onSubmit={addTask}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Title *</label>
              <input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="form-group full">
              <label>Description</label>
              <textarea rows={2} value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Due date</label>
              <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={taskForm.status} onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}>
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!taskDelete}
        title="Delete task"
        message={`Delete task "${taskDelete?.title}"?`}
        onConfirm={deleteTaskConfirm}
        onCancel={() => !deletingTask && setTaskDelete(null)}
        loading={deletingTask}
      />
      <ConfirmDialog
        open={!!expenseDelete}
        title="Delete expense"
        message={`Delete expense "${expenseDelete?.title}"? This also removes the linked transaction.`}
        onConfirm={confirmDeleteExpense}
        onCancel={() => !deletingExpense && setExpenseDelete(null)}
        loading={deletingExpense}
      />
      <ConfirmDialog
        open={deleteProjectOpen}
        title="Delete project"
        message={`Delete "${project.name}"? Projects with financial transactions cannot be deleted.`}
        onConfirm={confirmDeleteProject}
        onCancel={() => !deletingProject && setDeleteProjectOpen(false)}
        loading={deletingProject}
      />
    </div>
  );
}
