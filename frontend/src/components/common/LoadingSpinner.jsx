export default function LoadingSpinner({ label = 'Loading…', fullPage = false }) {
  const wrapStyle = fullPage
    ? { minHeight: '100vh' }
    : { minHeight: '280px' }
  return (
    <div className="loading-wrap" style={wrapStyle}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" role="status" aria-label="Loading" />
        {label && (
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
        )}
      </div>
    </div>
  )
}

export function PageLoader() {
  return <LoadingSpinner label="" fullPage />
}