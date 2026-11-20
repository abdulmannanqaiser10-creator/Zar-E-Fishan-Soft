export default function FormField({
  label,
  name,
  required,
  error,
  hint,
  children,
  className = '',
}) {
  return (
    <div className={`form-field ${className}`.trim()}>
      {label && (
        <label className={`form-label ${required ? 'form-label--required' : ''}`} htmlFor={name}>
          {label}
        </label>
      )}
      {children}
      {error && <p className="form-error">{error}</p>}
      {!error && hint && <p className="form-hint">{hint}</p>}
    </div>
  )
}