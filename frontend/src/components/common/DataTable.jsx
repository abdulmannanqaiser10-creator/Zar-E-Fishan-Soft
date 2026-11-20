import EmptyState from './EmptyState';

export default function DataTable({ columns, rows, emptyTitle, emptyDescription, pagination, onPageChange }) {
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id || row.id || JSON.stringify(row)}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && pagination.pages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange?.(pagination.page - 1)}
          >
            Previous
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => onPageChange?.(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
