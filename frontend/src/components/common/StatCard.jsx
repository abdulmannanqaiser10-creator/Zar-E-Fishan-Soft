export default function StatCard({ label, value, icon: Icon, hint }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && (
        <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{hint}</div>
      )}
      {Icon && (
        <div className="icon-wrap">
          <Icon size={18} />
        </div>
      )}
    </div>
  );
}
