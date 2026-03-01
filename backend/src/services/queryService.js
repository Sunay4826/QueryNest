import { pool } from '../config/db.js';
import { createHttpError } from '../middleware/errorHandler.js';
import { validateSqlQuery } from '../utils/sqlValidation.js';

export async function executeStudentQuery({ assignmentId, sql }) {
  const validation = validateSqlQuery(sql);
  if (!validation.valid) {
    throw createHttpError(400, validation.reason);
  }

  const assignmentRes = await pool.query(
    'SELECT id, db_schema FROM assignments WHERE id = $1 LIMIT 1',
    [assignmentId]
  );

  if (!assignmentRes.rows.length) {
    throw createHttpError(404, 'Assignment not found.');
  }

  const dbSchema = assignmentRes.rows[0].db_schema;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO ${sanitizeIdentifier(dbSchema)}`);
      const result = await client.query({
        text: sql,
        query_timeout: 5000
      });
      await client.query('ROLLBACK');

      return {
        columns: result.fields.map((field) => field.name),
        rows: result.rows,
        rowCount: result.rowCount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error?.statusCode) throw error;
    throw createHttpError(400, `SQL error: ${error.message}`);
  }
}

function sanitizeIdentifier(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw createHttpError(400, `Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}
