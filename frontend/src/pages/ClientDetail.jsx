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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import { formatCurrency, formatDate } from '../utils/format';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <LoadingSpinner label="Loading client..." />;
  if (!client) return null;

  const projects = client.projects || [];
  const invoices = client.invoices || [];
  const paymentHistory = client.paymentHistory || [];

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

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle="Client profile, projects and billing"
        actions={
          <Link to="/clients" className="btn btn-outline">
            <ArrowLeft size={16} style={{ marginRight: 6 }} />
            Back to clients
          </Link>
        }
      />

      <div className="stat-grid">
        <StatCard label="Total project value" value={formatCurrency(client.totalProjectValue)} icon={Briefcase} />
        <StatCard label="Total paid" value={formatCurrency(client.totalPaid)} icon={CircleDollarSign} />
        <StatCard label="Pending" value={formatCurrency(client.totalPending)} icon={Clock} />
        <StatCard
          label="Projects"
          value={projects.length}
          icon={Wallet}
        />
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
              <span>
                {[client.address, client.city].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {client.notes && (
            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>{client.notes}</p>
          )}
        </div>
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
    </div>
  );
}