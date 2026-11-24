import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Wallet,
  CircleDollarSign,
  Clock,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsAPI, erpAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import { formatCurrency, formatDate } from '../utils/format';

const CRM_STATUSES = ['Lead', 'Follow-up', 'Closed', 'Client'];

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followOpen, setFollowOpen] = useState(false);
  const [followForm, setFollowForm] = useState({ note: '', nextFollowUp: '', crmStatus: '' });
  const [followSaving, setFollowSaving] = useState(false);

  const loadClient = useCallback(() => {
    setLoading(true);
    clientsAPI
      .get(id)
      .then((res) => setClient(res.data.data))
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to load client');
        navigate('/clients');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const openFollowUp = () => {
    setFollowForm({
      note: '',
      nextFollowUp: '',
      crmStatus: client?.crmStatus || '',
    });
    setFollowOpen(true);
  };

  const submitFollowUp = async (e) => {
    e.preventDefault();
    if (!followForm.note.trim()) {
      toast.error('Note is required');
      return;
    }
    setFollowSaving(true);
    try {
      const res = await erpAPI.addFollowUp(id, {
        note: followForm.note.trim(),
        nextFollowUp: followForm.nextFollowUp || undefined,
        crmStatus: followForm.crmStatus || undefined,
      });
      setClient(res.data.data);
      toast.success('Follow-up added');
      setFollowOpen(false);
      loadClient();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add follow-up');
    } finally {
      setFollowSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading client..." />;
  if (!client) return null;

  const projects = client.projects || [];
  const invoices = client.invoices || [];
  const paymentHistory = client.paymentHistory || [];
  const followUps = [...(client.followUps || [])].reverse();

  const projectColumns = [
    {
      key: 'name',
      label: 'Project',
      render: (row) => (
        <Link to={`/projects/${row._id}`} style={{ fontWeight: 600, color: 'var(--olive)' }}>
          {row.name}
        </Link>
      ),
    },
    { key: 'projectId', label: 'ID' },
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
      key: 'startDate',
      label: 'Started',
      render: (row) => formatDate(row.startDate),
    },
  ];

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    {
      key: 'issueDate',
      label: 'Issued',
      render: (row) => formatDate(row.issueDate || row.createdAt),
    },
    {
      key: 'total',
      label: 'Total',
      render: (row) => formatCurrency(row.total),
    },
    {
      key: 'paidAmount',
      label: 'Paid',
      render: (row) => formatCurrency(row.paidAmount),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const paymentColumns = [
    { key: 'transactionId', label: 'ID' },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'category', label: 'Category' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
          +{formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Notes',
      render: (row) => row.description || row.reference || '—',
    },
  ];

  const followColumns = [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date || row.createdAt) },
    { key: 'note', label: 'Note' },
    {
      key: 'nextFollowUp',
      label: 'Next date',
      render: (row) => formatDate(row.nextFollowUp),
    },
  ];

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={
          <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            Client profile, projects and billing
            <StatusBadge status={client.crmStatus || 'Client'} />
          </span>
        }
        actions={
          <>
            <button type="button" className="btn btn-gold" onClick={openFollowUp}>
              <MessageSquare size={16} style={{ marginRight: 6 }} />
              Add follow-up
            </button>
            <Link to="/clients" className="btn btn-outline">
              <ArrowLeft size={16} style={{ marginRight: 6 }} />
              Back to clients
            </Link>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard label="Total project value" value={formatCurrency(client.totalProjectValue)} icon={Briefcase} />
        <StatCard label="Total paid" value={formatCurrency(client.totalPaid)} icon={CircleDollarSign} />
        <StatCard label="Pending" value={formatCurrency(client.totalPending)} icon={Clock} />
        <StatCard label="Projects" value={projects.length} icon={Wallet} />
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-title">Contact</h3>
        <div style={{ display: 'grid', gap: '0.65rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Phone size={16} style={{ opacity: 0.6 }} />
            <a href={`tel:${client.phone}`}>{client.phone}</a>
          </div>
          {client.email && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Mail size={16} style={{ opacity: 0.6 }} />
              <a href={`mailto:${client.email}`}>{client.email}</a>
            </div>
          )}
          {(client.address || client.city) && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <MapPin size={16} style={{ opacity: 0.6, marginTop: 2 }} />
              <span>{[client.address, client.city].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {client.source && (
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Source: {client.source}</p>
          )}
          {client.notes && (
            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>{client.notes}</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="section-title" style={{ margin: 0 }}>
            Follow-ups
          </h3>
          <button type="button" className="btn btn-gold btn-sm" onClick={openFollowUp}>
            <MessageSquare size={14} style={{ marginRight: 4 }} />
            Log follow-up
          </button>
        </div>
        <DataTable
          columns={followColumns}
          rows={followUps}
          emptyTitle="No follow-ups"
          emptyDescription="Log a call or visit to track CRM progress."
        />
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-title">Project history</h3>
        <DataTable
          columns={projectColumns}
          rows={projects}
          emptyTitle="No projects"
          emptyDescription="This client has no projects yet."
        />
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-title">Invoices</h3>
        <DataTable
          columns={invoiceColumns}
          rows={invoices}
          emptyTitle="No invoices"
          emptyDescription="Invoices issued to this client appear here."
        />
      </div>

      <div className="card">
        <h3 className="section-title">Payment history</h3>
        <DataTable
          columns={paymentColumns}
          rows={paymentHistory}
          emptyTitle="No payments"
          emptyDescription="Income transactions recorded for this client."
        />
      </div>

      <Modal
        open={followOpen}
        title={`Follow-up — ${client.name}`}
        onClose={() => !followSaving && setFollowOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setFollowOpen(false)} disabled={followSaving}>
              Cancel
            </button>
            <button type="submit" form="client-follow-form" className="btn btn-primary" disabled={followSaving}>
              {followSaving ? 'Saving...' : 'Save follow-up'}
            </button>
          </>
        }
      >
        <form id="client-follow-form" onSubmit={submitFollowUp}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Note *</label>
              <textarea
                rows={3}
                value={followForm.note}
                onChange={(e) => setFollowForm((f) => ({ ...f, note: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Next follow-up date</label>
              <input
                type="date"
                value={followForm.nextFollowUp}
                onChange={(e) => setFollowForm((f) => ({ ...f, nextFollowUp: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Update CRM status</label>
              <select
                value={followForm.crmStatus}
                onChange={(e) => setFollowForm((f) => ({ ...f, crmStatus: e.target.value }))}
              >
                <option value="">Keep current</option>
                {CRM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
