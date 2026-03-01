export default function ResultTable({ columns, rows, rowCount }) {
  if (!columns?.length) {
    return <p className="panel__empty">Run a query to see results.</p>;
  }

  return (
    <div className="result-table">
      <p className="result-table__meta">Rows returned: {rowCount}</p>
      <div className="result-table__wrapper">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column) => (
                    <td key={`${rowIndex}-${column}`}>{String(row[column] ?? 'NULL')}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>No rows matched your query.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
