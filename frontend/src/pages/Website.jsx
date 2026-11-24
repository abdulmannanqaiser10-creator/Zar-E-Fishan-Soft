import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { erpAPI, settingsAPI, projectsAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/format';

const TABS = [
  { id: 'budgets', label: 'Budgets' },
  { id: 'blogs', label: 'Blogs' },
  { id: 'projects', label: 'Projects' },
  { id: 'fonts', label: 'Fonts' },
];

const emptyBudget = () => ({
  title: '',
  category: 'General',
  allocated: '',
  spent: '',
  period: '',
  notes: '',
});

const emptyBlog = () => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  status: 'draft',
  tags: '',
});

const emptyProject = () => ({
  title: '',
  slug: '',
  description: '',
  coverImage: '',
  gallery: '',
  linkedProject: '',
  status: 'draft',
  featured: false,
  sortOrder: 0,
});

const emptyFonts = () => ({
  heading: 'Playfair Display',
  body: 'Inter',
  websiteHeading: 'Playfair Display',
  websiteBody: 'Inter',
});

export default function Website() {
  const [tab, setTab] = useState('budgets');
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [erpProjects, setErpProjects] = useState([]);
  const [fonts, setFonts] = useState(emptyFonts());
  const [logo, setLogo] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [budgetForm, setBudgetForm] = useState(emptyBudget());
  const [blogForm, setBlogForm] = useState(emptyBlog());
  const [projectForm, setProjectForm] = useState(emptyProject());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [savingFonts, setSavingFonts] = useState(false);

  const loadTab = useCallback(() => {
    setLoading(true);
    const tasks = [];
    if (tab === 'budgets') {
      tasks.push(
        erpAPI.websiteBudgets().then((res) => setBudgets(res.data.data || [])),
      );
    } else if (tab === 'blogs') {
      tasks.push(erpAPI.blogs().then((res) => setBlogs(res.data.data || [])));
    } else if (tab === 'projects') {
      tasks.push(
        erpAPI.websiteProjects().then((res) => setProjects(res.data.data || [])),
        projectsAPI.list({ limit: 500 }).then((res) => setErpProjects(res.data.data || [])),
      );
    } else if (tab === 'fonts') {
      tasks.push(
        settingsAPI.get().then((res) => {
          const s = res.data.data || {};
          setFonts({ ...emptyFonts(), ...(s.fonts || {}) });
          setLogo(s.logo || '');
        }),
      );
    }
    Promise.all(tasks)
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  const openCreate = () => {
    setEditing(null);
    if (tab === 'budgets') setBudgetForm(emptyBudget());
    if (tab === 'blogs') setBlogForm(emptyBlog());
    if (tab === 'projects') setProjectForm(emptyProject());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    if (tab === 'budgets') {
      setBudgetForm({
        title: row.title || '',
        category: row.category || 'General',
        allocated: String(row.allocated ?? ''),
        spent: String(row.spent ?? ''),
        period: row.period || '',
        notes: row.notes || '',
      });
    } else if (tab === 'blogs') {
      setBlogForm({
        title: row.title || '',
        slug: row.slug || '',
        excerpt: row.excerpt || '',
        content: row.content || '',
        coverImage: row.coverImage || '',
        status: row.status || 'draft',
        tags: Array.isArray(row.tags) ? row.tags.join(', ') : '',
      });
    } else if (tab === 'projects') {
      setProjectForm({
        title: row.title || '',
        slug: row.slug || '',
        description: row.description || '',
        coverImage: row.coverImage || '',
        gallery: Array.isArray(row.gallery) ? row.gallery.join('\n') : '',
        linkedProject: row.linkedProject?._id || row.linkedProject || '',
        status: row.status || 'draft',
        featured: !!row.featured,
        sortOrder: row.sortOrder || 0,
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (tab === 'budgets') {
        if (!budgetForm.title.trim() || budgetForm.allocated === '') {
          toast.error('Title and allocated amount are required');
          setSaving(false);
          return;
        }
        await erpAPI.saveWebsiteBudget(
          {
            title: budgetForm.title.trim(),
            category: budgetForm.category.trim(),
            allocated: Number(budgetForm.allocated) || 0,
            spent: Number(budgetForm.spent) || 0,
            period: budgetForm.period.trim(),
            notes: budgetForm.notes.trim(),
          },
          editing?._id,
        );
        toast.success(editing ? 'Budget updated' : 'Budget created');
      } else if (tab === 'blogs') {
        if (!blogForm.title.trim()) {
          toast.error('Title is required');
          setSaving(false);
          return;
        }
        await erpAPI.saveBlog(
          {
            title: blogForm.title.trim(),
            slug: blogForm.slug.trim() || undefined,
            excerpt: blogForm.excerpt.trim(),
            content: blogForm.content,
            coverImage: blogForm.coverImage.trim(),
            status: blogForm.status,
            tags: blogForm.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          },
          editing?._id,
        );
        toast.success(editing ? 'Blog updated' : 'Blog created');
      } else if (tab === 'projects') {
        if (!projectForm.title.trim()) {
          toast.error('Title is required');
          setSaving(false);
          return;
        }
        await erpAPI.saveWebsiteProject(
          {
            title: projectForm.title.trim(),
            slug: projectForm.slug.trim() || undefined,
            description: projectForm.description.trim(),
            coverImage: projectForm.coverImage.trim(),
            gallery: projectForm.gallery
              .split('\n')
              .map((g) => g.trim())
              .filter(Boolean),
            linkedProject: projectForm.linkedProject || undefined,
            status: projectForm.status,
            featured: projectForm.featured,
            sortOrder: Number(projectForm.sortOrder) || 0,
          },
          editing?._id,
        );
        toast.success(editing ? 'Website project updated' : 'Website project created');
      }
      setModalOpen(false);
      loadTab();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (tab === 'budgets') await erpAPI.deleteWebsiteBudget(deleteTarget._id);
      else if (tab === 'blogs') await erpAPI.deleteBlog(deleteTarget._id);
      else if (tab === 'projects') await erpAPI.deleteWebsiteProject(deleteTarget._id);
      toast.success('Deleted');
      setDeleteTarget(null);
      loadTab();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const saveFonts = async (e) => {
    e.preventDefault();
    setSavingFonts(true);
    try {
      await erpAPI.updateFonts({ fonts, logo });
      toast.success('Fonts saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save fonts');
    } finally {
      setSavingFonts(false);
    }
  };

  const budgetColumns = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'period', label: 'Period', render: (r) => r.period || '—' },
    { key: 'allocated', label: 'Allocated', render: (r) => formatCurrency(r.allocated) },
    { key: 'spent', label: 'Spent', render: (r) => formatCurrency(r.spent) },
    {
      key: 'remaining',
      label: 'Remaining',
      render: (r) => formatCurrency((r.allocated || 0) - (r.spent || 0)),
    },
    {
      key: 'actions',
      label: '',
      width: '90px',
      render: (r) => (
        <div className="actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>
            <Pencil size={14} />
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(r)}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const blogColumns = [
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'publishedAt', label: 'Published', render: (r) => formatDate(r.publishedAt) },
    {
      key: 'actions',
      label: '',
      width: '90px',
      render: (r) => (
        <div className="actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>
            <Pencil size={14} />
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(r)}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const projectColumns = [
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    {
      key: 'linked',
      label: 'ERP project',
      render: (r) => r.linkedProject?.name || '—',
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'featured',
      label: 'Featured',
      render: (r) => (r.featured ? 'Yes' : 'No'),
    },
    {
      key: 'actions',
      label: '',
      width: '90px',
      render: (r) => (
        <div className="actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>
            <Pencil size={14} />
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(r)}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const modalTitle =
    tab === 'budgets'
      ? editing
        ? 'Edit budget'
        : 'New budget'
      : tab === 'blogs'
        ? editing
          ? 'Edit blog'
          : 'New blog'
        : editing
          ? 'Edit website project'
          : 'New website project';

  return (
    <div>
      <PageHeader
        title="Website"
        subtitle="Public site content, budgets, and typography"
        actions={
          tab !== 'fonts' ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              New {tab === 'budgets' ? 'budget' : tab === 'blogs' ? 'blog' : 'project'}
            </button>
          ) : null
        }
      />

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading..." />
      ) : tab === 'fonts' ? (
        <div className="card">
          <h3 className="section-title">Brand & website fonts</h3>
          <form onSubmit={saveFonts}>
            <div className="form-grid">
              <div className="form-group">
                <label>ERP heading font</label>
                <input
                  value={fonts.heading}
                  onChange={(e) => setFonts((f) => ({ ...f, heading: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>ERP body font</label>
                <input
                  value={fonts.body}
                  onChange={(e) => setFonts((f) => ({ ...f, body: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Website heading font</label>
                <input
                  value={fonts.websiteHeading}
                  onChange={(e) => setFonts((f) => ({ ...f, websiteHeading: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Website body font</label>
                <input
                  value={fonts.websiteBody}
                  onChange={(e) => setFonts((f) => ({ ...f, websiteBody: e.target.value }))}
                />
              </div>
              <div className="form-group full">
                <label>Logo URL / data URL</label>
                <textarea
                  rows={2}
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://... or data:image/..."
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingFonts} style={{ marginTop: '1rem' }}>
              {savingFonts ? 'Saving...' : 'Save fonts'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card">
          <DataTable
            columns={tab === 'budgets' ? budgetColumns : tab === 'blogs' ? blogColumns : projectColumns}
            rows={tab === 'budgets' ? budgets : tab === 'blogs' ? blogs : projects}
            emptyTitle={`No ${tab}`}
            emptyDescription={`Create a ${tab.slice(0, -1)} to get started.`}
          />
        </div>
      )}

      <Modal
        open={modalOpen}
        title={modalTitle}
        large={tab !== 'budgets'}
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="website-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form id="website-form" onSubmit={handleSave}>
          {tab === 'budgets' && (
            <div className="form-grid">
              <div className="form-group">
                <label>Title *</label>
                <input
                  value={budgetForm.title}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Allocated *</label>
                <input
                  type="number"
                  min="0"
                  value={budgetForm.allocated}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, allocated: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Spent</label>
                <input
                  type="number"
                  min="0"
                  value={budgetForm.spent}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, spent: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Period</label>
                <input
                  value={budgetForm.period}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, period: e.target.value }))}
                  placeholder="Q1 2026"
                />
              </div>
              <div className="form-group full">
                <label>Notes</label>
                <textarea
                  rows={2}
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          )}

          {tab === 'blogs' && (
            <div className="form-grid">
              <div className="form-group">
                <label>Title *</label>
                <input
                  value={blogForm.title}
                  onChange={(e) => setBlogForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Slug</label>
                <input
                  value={blogForm.slug}
                  onChange={(e) => setBlogForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto from title"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={blogForm.status}
                  onChange={(e) => setBlogForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tags</label>
                <input
                  value={blogForm.tags}
                  onChange={(e) => setBlogForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="comma separated"
                />
              </div>
              <div className="form-group full">
                <label>Cover image URL</label>
                <input
                  value={blogForm.coverImage}
                  onChange={(e) => setBlogForm((f) => ({ ...f, coverImage: e.target.value }))}
                />
              </div>
              <div className="form-group full">
                <label>Excerpt</label>
                <textarea
                  rows={2}
                  value={blogForm.excerpt}
                  onChange={(e) => setBlogForm((f) => ({ ...f, excerpt: e.target.value }))}
                />
              </div>
              <div className="form-group full">
                <label>Content</label>
                <textarea
                  rows={8}
                  value={blogForm.content}
                  onChange={(e) => setBlogForm((f) => ({ ...f, content: e.target.value }))}
                />
              </div>
            </div>
          )}

          {tab === 'projects' && (
            <div className="form-grid">
              <div className="form-group">
                <label>Title *</label>
                <input
                  value={projectForm.title}
                  onChange={(e) => setProjectForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Slug</label>
                <input
                  value={projectForm.slug}
                  onChange={(e) => setProjectForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="form-group">
                <label>Linked ERP project</label>
                <select
                  value={projectForm.linkedProject}
                  onChange={(e) => setProjectForm((f) => ({ ...f, linkedProject: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {erpProjects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Sort order</label>
                <input
                  type="number"
                  value={projectForm.sortOrder}
                  onChange={(e) => setProjectForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Featured</label>
                <select
                  value={projectForm.featured ? '1' : '0'}
                  onChange={(e) => setProjectForm((f) => ({ ...f, featured: e.target.value === '1' }))}
                >
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div className="form-group full">
                <label>Cover image URL</label>
                <input
                  value={projectForm.coverImage}
                  onChange={(e) => setProjectForm((f) => ({ ...f, coverImage: e.target.value }))}
                />
              </div>
              <div className="form-group full">
                <label>Gallery URLs (one per line)</label>
                <textarea
                  rows={3}
                  value={projectForm.gallery}
                  onChange={(e) => setProjectForm((f) => ({ ...f, gallery: e.target.value }))}
                />
              </div>
              <div className="form-group full">
                <label>Description</label>
                <textarea
                  rows={4}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete item"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
