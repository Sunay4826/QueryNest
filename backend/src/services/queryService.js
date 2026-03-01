import { pool } from '../config/db.js';
import { createHttpError } from '../middleware/errorHandler.js';
import { validateSqlQuery } from '../utils/sqlValidation.js';
import { evaluateExpectedOutput } from '../utils/resultComparison.js';

export async function executeStudentQuery({ assignmentId, sql }) {
  const validation = validateSqlQuery(sql);
  if (!validation.valid) {
    throw createHttpError(400, validation.reason);
  }

  const assignmentRes = await pool.query(
    'SELECT id, db_schema, expected_output FROM assignments WHERE id = $1 LIMIT 1',
    [assignmentId]
  );

  if (!assignmentRes.rows.length) {
    throw createHttpError(404, 'Assignment not found.');
  }

  const assignment = assignmentRes.rows[0];
  const dbSchema = assignment.db_schema;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO ${sanitizeIdentifier(dbSchema)}`);
      const startedAt = Date.now();
      const result = await client.query({
        text: sql,
        query_timeout: 5000
      });
      const durationMs = Date.now() - startedAt;
      await client.query('ROLLBACK');

      const columns = result.fields.map((field) => field.name);
      const rows = result.rows;
      const evaluation = evaluateExpectedOutput({
        expectedOutput: assignment.expected_output,
        columns,
        rows
      });

      return {
        columns,
        rows,
        rowCount: result.rowCount,
        durationMs,
        evaluation
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error?.statusCode) {
      throw error;
    }
    throw createHttpError(400, `SQL error: ${error.message}`);
  }
}

function sanitizeIdentifier(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw createHttpError(400, `Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}
