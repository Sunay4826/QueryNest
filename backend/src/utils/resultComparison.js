export function evaluateExpectedOutput({ expectedOutput, columns, rows }) {
  if (!expectedOutput || expectedOutput.type !== 'table' || !Array.isArray(expectedOutput.value)) {
    return {
      hasExpectedOutput: false,
      isCorrect: null,
      feedback: 'No expected output configured for auto-check on this question.'
    };
  }

  const expectedRows = expectedOutput.value;
  const actualSet = rows.map(stableRowString).sort();
  const expectedSet = expectedRows.map(stableRowString).sort();

  const isCorrect =
    actualSet.length === expectedSet.length &&
    actualSet.every((value, index) => value === expectedSet[index]);

  return {
    hasExpectedOutput: true,
    isCorrect,
    feedback: isCorrect
      ? 'Great job. Your result matches the expected output.'
      : 'Result does not match expected output yet. Recheck filters, joins, grouping, and sort logic.',
    expectedRowCount: expectedRows.length,
    actualRowCount: rows.length,
    expectedColumns: extractColumns(expectedRows),
    actualColumns: columns
  };
}

function stableRowString(row) {
  const keys = Object.keys(row).sort();
  const normalized = {};
  for (const key of keys) {
    normalized[key] = row[key];
  }
  return JSON.stringify(normalized);
}

function extractColumns(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]);
}
