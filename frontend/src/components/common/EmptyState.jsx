import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No data found', description = 'Try adjusting filters or add a new record.', action }) {
  return (
    <div className="empty-state">
      <Inbox size={40} color="#C5A675" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
