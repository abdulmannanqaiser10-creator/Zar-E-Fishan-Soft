import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { vendorsAPI } from '../api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/format';

export default function VendorDetail() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorsAPI.get(id)
      .then((res) => setVendor(res.data.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load vendor'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!vendor) return null;

  return (
    <div>
      <Link to="/vendors" className="btn btn-outline btn-sm" style={{ marginBottom: '1rem' }}><ArrowLeft size={14} /> Back</Link>
      <div className="page-header">
        <div>
          <h1>{vendor.name}</h1>
          <p>{vendor.contactPerson} · {vendor.phone} · {vendor.email || 'No email'}</p>
        </div>
      </div>
      <div className="stat-grid">
        <StatCard label="Total Purchases" value={formatCurrency(vendor.totalPurchases)} />
        <StatCard label="Paid" value={formatCurrency(vendor.totalPaid)} />
        <StatCard label="Outstanding" value={formatCurrency(vendor.totalOutstanding)} />
      </div>
      <div className="grid-2">
        <div className="card">
          <h3 className="section-title">Purchase History</h3>
          {vendor.purchaseHistory?.length ? vendor.purchaseHistory.map((po) => (
            <div key={po._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <strong>{po.poNumber}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(po.orderDate)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>{formatCurrency(po.total)}</div>
                <StatusBadge status={po.status} />
              </div>
            </div>
          )) : <p style={{ color: 'var(--text-muted)' }}>No purchases</p>}
        </div>
        <div className="card">
          <h3 className="section-title">Payment Records</h3>
          {vendor.paymentHistory?.length ? vendor.paymentHistory.map((t) => (
            <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid var(--border)' }}>
              <span>{formatDate(t.date)} · {t.category}</span>
              <strong>{formatCurrency(t.amount)}</strong>
            </div>
          )) : <p style={{ color: 'var(--text-muted)' }}>No payments</p>}
        </div>
      </div>
    </div>
  );
}
