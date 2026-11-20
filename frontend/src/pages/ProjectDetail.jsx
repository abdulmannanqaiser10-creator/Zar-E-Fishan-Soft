import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, clientsAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import { formatCurrency, formatDate, formatDateTime, projectStatuses } from '../utils/format';

const STATUS_OPTIONS =
  projectStatuses ?? ['Planning', 'In Progress', 'On Hold', 'Completed'];

const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
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
});

const emptyTaskForm = () => ({
  title: '',
  description: '',
  dueDate: '',
  status: 'todo',
});

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [projectForm, setProjectForm] = useState(emptyProjectForm());
  const [savingProject, setSavingProject] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm());
  const [savingTask, setSavingTask] = useState(false);
  const [taskDelete, setTaskDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

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
    });
    setEditOpen(true);
  };

  const validateProjectForm = () => {
    if (!projectForm.name.trim()) {
      toast.error('Project name is required');
      return false;
    }
    if (!projectForm.client) {
      toast.error('Client is required');
      return false;
    }
    if (projectForm.budget === '' || Number(projectForm.budget) < 0) {
      toast.error('Valid budget is required');
      return false;
    }
    if (!projectForm.startDate) {
      toast.error('Start date is required');
      return false;
    }
    return true;
  };

  const saveProject = async (e) => {
    e.preventDefault();
    if (!validateProjectForm()) return;
    setSavingProject(true);
    const payload = {
      name: projectForm.name.trim(),
      client: projectForm.client,
      budget: Number(projectForm.budget),
      startDate: projectForm.startDate,
      endDate: projectForm.endDate || undefined,
      status: projectForm.status,
      description: projectForm.description.trim(),
      location: projectForm.location.trim(),
    };
    try {
      const res = await projectsAPI.update(id, payload);
      setProject((prev) => ({
        ...prev,
        ...res.data.data,
        transactions: prev?.transactions,
        activities: prev?.activities,
      }));
      toast.success('Project updated');
      setEditOpen(false);
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSavingProject(false);
    }
  };

  const openTaskModal = () => {
    setTaskForm(emptyTaskForm());
    setTaskModalOpen(true);
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    setSavingTask(true);
    try {
      const res = await projectsAPI.addTask(id, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        dueDate: taskForm.dueDate || undefined,
        status: taskForm.status,
      });
      const updated = res.data.data;
      setProject((prev) => ({
        ...prev,
        tasks: updated.tasks,
        progress: updated.progress,
      }));
      toast.success('Task added');
      setTaskModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add task');
    } finally {
      setSavingTask(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await projectsAPI.updateTask(id, taskId, { status });
      const updated = res.data.data;
      setProject((prev) => ({
        ...prev,
        tasks: updated.tasks,
        progress: updated.progress,
      }));
      toast.success('Task updated');
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
      const res = await projectsAPI.deleteTask(id, taskDelete._id);
      const updated = res.data.data;
      setProject((prev) => ({
        ...prev,
        tasks: updated.tasks,
        progress: updated.progress,
      }));
      toast.success('Task deleted');
      setTaskDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    } finally {
      setDeletingTask(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading project..." />;
  if (!project) return null;

  const profit = (project.totalRevenue || 0) - (project.totalExpenses || 0);
  const tasks = project.tasks || [];
  const transactions = project.transactions || [];
  const activities = project.activities || [];

  const transactionColumns = [
    { key: 'transactionId', label: 'ID' },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'category', label: 'Category' },
    {
      key: 'type',
      label: 'Type',
      render: (row) => <StatusBadge status={row.type} />,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <span style={{ color: row.type === 'income' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
          {row.type === 'income' ? '+' : '-'}
          {formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <span>{project.projectId}</span>
            <StatusBadge status={project.status} />
            {project.client && (
              <Link to={`/clients/${project.client._id}`} style={{ color: 'var(--gold)' }}>
                {project.client.name}
              </Link>
            )}
          </span>
        }
        actions={
          <>
            <Link to="/projects" className="btn btn-outline">
              <ArrowLeft size={16} style={{ marginRight: 6 }} />
              Back
            </Link>
            <button type="button" className="btn btn-primary" onClick={openEdit}>
              <Pencil size={16} style={{ marginRight: 6 }} />
              Edit project
            </button>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard label="Budget" value={formatCurrency(project.budget)} icon={Wallet} />
        <StatCard label="Revenue" value={formatCurrency(project.totalRevenue)} icon={TrendingUp} />
        <StatCard label="Expenses" value={formatCurrency(project.totalExpenses)} icon={TrendingDown} />
        <StatCard
          label="Net (Revenue − Expenses)"
          value={formatCurrency(profit)}
          icon={Briefcase}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <h3 className="section-title">Details</h3>
          <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Calendar size={16} style={{ opacity: 0.6 }} />
              <span>
                {formatDate(project.startDate)}
                {project.endDate ? ` — ${formatDate(project.endDate)}` : ''}
              </span>
            </div>
            {project.location && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <MapPin size={16} style={{ opacity: 0.6 }} />
                <span>{project.location}</span>
              </div>
            )}
            {project.description && (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{project.description}</p>
            )}
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              <span>Progress</span>
              <strong>{project.progress ?? 0}%</strong>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: 'var(--cream-dark)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, project.progress || 0))}%`,
                  height: '100%',
                  background: 'var(--olive)',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              Tasks
            </h3>
            <button type="button" className="btn btn-gold btn-sm" onClick={openTaskModal}>
              <Plus size={14} style={{ marginRight: 4 }} />
              Add task
            </button>
          </div>
          {tasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No tasks yet. Add one to track progress.</p>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Progress is calculated from completed tasks ({tasks.filter((t) => t.status === 'done').length}/{tasks.length}).
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {tasks.map((task) => (
              <div
                key={task._id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  padding: '0.65rem 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--olive)' }}>{task.title}</div>
                  {task.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{task.description}</div>
                  )}
                  {task.dueDate && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due {formatDate(task.dueDate)}</div>
                  )}
                </div>
                <select
                  className="filter-select"
                  value={task.status}
                  disabled={updatingTaskId === task._id}
                  onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                  style={{ minWidth: 130 }}
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setTaskDelete(task)}
                  aria-label="Delete task"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-title">Transactions</h3>
        <DataTable
          columns={transactionColumns}
          rows={transactions}
          emptyTitle="No transactions"
          emptyDescription="Income and expenses linked to this project appear here."
        />
      </div>

      <div className="card">
        <h3 className="section-title">Activity</h3>
        {activities.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activities.map((a) => (
              <div key={a._id}>
                <div style={{ fontSize: '0.9rem', color: 'var(--olive)' }}>{a.description}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {a.user?.name || 'System'} · {formatDateTime(a.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No activity recorded</p>
        )}
      </div>

      <Modal
        open={editOpen}
        title="Edit project"
        onClose={() => !savingProject && setEditOpen(false)}
        large
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setEditOpen(false)} disabled={savingProject}>
              Cancel
            </button>
            <button type="submit" form="detail-project-form" className="btn btn-primary" disabled={savingProject}>
              {savingProject ? 'Saving...' : 'Save changes'}
            </button>
          </>
        }
      >
        <form id="detail-project-form" onSubmit={saveProject}>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="dp-name">Project name *</label>
              <input
                id="dp-name"
                value={projectForm.name}
                onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="dp-client">Client *</label>
              <select
                id="dp-client"
                value={projectForm.client}
                onChange={(e) => setProjectForm((f) => ({ ...f, client: e.target.value }))}
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
              <label htmlFor="dp-budget">Budget *</label>
              <input
                id="dp-budget"
                type="number"
                min="0"
                value={projectForm.budget}
                onChange={(e) => setProjectForm((f) => ({ ...f, budget: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="dp-start">Start date *</label>
              <input
                id="dp-start"
                type="date"
                value={projectForm.startDate}
                onChange={(e) => setProjectForm((f) => ({ ...f, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="dp-end">End date</label>
              <input
                id="dp-end"
                type="date"
                value={projectForm.endDate}
                onChange={(e) => setProjectForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="dp-status">Status</label>
              <select
                id="dp-status"
                value={projectForm.status}
                onChange={(e) => setProjectForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="dp-location">Location</label>
              <input
                id="dp-location"
                value={projectForm.location}
                onChange={(e) => setProjectForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="form-group full">
              <label htmlFor="dp-desc">Description</label>
              <textarea
                id="dp-desc"
                rows={3}
                value={projectForm.description}
                onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
              />
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
            <button type="button" className="btn btn-outline" onClick={() => setTaskModalOpen(false)} disabled={savingTask}>
              Cancel
            </button>
            <button type="submit" form="add-task-form" className="btn btn-primary" disabled={savingTask}>
              {savingTask ? 'Adding...' : 'Add task'}
            </button>
          </>
        }
      >
        <form id="add-task-form" onSubmit={addTask}>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="task-title">Title *</label>
              <input
                id="task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="form-group full">
              <label htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                rows={2}
                value={taskForm.description}
                onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="task-due">Due date</label>
              <input
                id="task-due"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="task-status">Status</label>
              <select
                id="task-status"
                value={taskForm.status}
                onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
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
    </div>
  );
}