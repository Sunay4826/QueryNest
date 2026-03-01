export default function SampleDataViewer({ sampleData }) {
  if (!sampleData?.length) {
    return <p className="panel__empty">No sample tables configured.</p>;
  }

  return (
    <div className="sample-data">
      {sampleData.map((table) => (
        <section className="sample-data__table" key={table.tableName}>
          <h3>{table.tableName}</h3>
          <p className="sample-data__schema">
            {table.columns.map((c) => `${c.column_name} (${c.data_type})`).join(', ')}
          </p>
          <div className="sample-data__wrapper">
            <table>
              <thead>
                <tr>
                  {table.columns.map((c) => (
                    <th key={c.column_name}>{c.column_name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length ? (
                  table.rows.map((row, idx) => (
                    <tr key={idx}>
                      {table.columns.map((c) => (
                        <td key={`${idx}-${c.column_name}`}>{String(row[c.column_name] ?? 'NULL')}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={table.columns.length}>No sample rows available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
