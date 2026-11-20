export default function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {Icon && (
        <div className="icon-wrap">
          <Icon size={18} />
        </div>
      )}
    </div>
  );
}
