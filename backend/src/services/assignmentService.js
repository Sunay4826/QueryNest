import { pool } from '../config/db.js';
import { createHttpError } from '../middleware/errorHandler.js';

export async function getAssignments() {
  const query = `
    SELECT id, title, difficulty, description
    FROM assignments
    ORDER BY id ASC;
  `;

  const { rows } = await pool.query(query);
  return rows;
}

export async function getAssignmentById(id) {
  const assignmentQuery = `
    SELECT id, title, difficulty, description, question, requirements, db_schema, schema_tables, expected_output
    FROM assignments
    WHERE id = $1;
  `;

  const { rows } = await pool.query(assignmentQuery, [id]);

  if (!rows.length) {
    throw createHttpError(404, 'Assignment not found.');
  }

  const assignment = rows[0];
  const tableNames = assignment.schema_tables || [];
  const dbSchema = assignment.db_schema;
  const safeSchema = sanitizeIdentifier(dbSchema);
  const sampleData = await Promise.all(
    tableNames.map(async (tableName) => {
      const safeTable = sanitizeIdentifier(tableName);
      const [dataRes, columnsRes] = await Promise.all([
        pool.query(`SELECT * FROM ${safeSchema}.${safeTable} LIMIT 10`),
        pool.query(
          `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position;
          `,
          [dbSchema, tableName]
        )
      ]);

      return {
        tableName,
        columns: columnsRes.rows,
        rows: dataRes.rows
      };
    })
  );

  return {
    ...assignment,
    sampleData
  };
}

function sanitizeIdentifier(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw createHttpError(400, `Invalid table reference: ${name}`);
  }
  return `"${name}"`;
}
