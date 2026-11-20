const map = {
  Planning: 'badge-info',
  'In Progress': 'badge-gold',
  'On Hold': 'badge-warning',
  Completed: 'badge-success',
  Pending: 'badge-warning',
  Approved: 'badge-info',
  Ordered: 'badge-gold',
  Received: 'badge-success',
  Cancelled: 'badge-danger',
  draft: 'badge-olive',
  sent: 'badge-info',
  partial: 'badge-warning',
  paid: 'badge-success',
  overdue: 'badge-danger',
  cancelled: 'badge-danger',
  income: 'badge-success',
  expense: 'badge-danger',
  todo: 'badge-olive',
  in_progress: 'badge-gold',
  done: 'badge-success',
  Rejected: 'badge-danger',
  Converted: 'badge-success',
  Low: 'badge-olive',
  Medium: 'badge-gold',
  High: 'badge-danger',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const cls = map[status] || 'badge-olive';
  return <span className={`badge ${cls}`}>{String(status).replace('_', ' ')}</span>;
}
