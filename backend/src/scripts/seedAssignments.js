import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedFilePath = path.resolve(__dirname, '../../data/assignments.seed.json');
const schemaSqlPath = path.resolve(__dirname, '../../sql/schema.sql');
const QUESTIONS_PER_DIFFICULTY = 10;

const TYPE_MAP = {
  INTEGER: 'INTEGER',
  INT: 'INTEGER',
  REAL: 'DOUBLE PRECISION',
  TEXT: 'TEXT',
  VARCHAR: 'TEXT'
};

function normalizeDifficulty(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'easy') return 'Easy';
  if (raw === 'hard') return 'Hard';
  return 'Medium';
}

function safeIdentifier(identifier) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function mapDataType(type) {
  const normalized = String(type || 'TEXT').trim().toUpperCase();
  return TYPE_MAP[normalized] || 'TEXT';
}

async function seed() {
  const rawSeed = await fs.readFile(seedFilePath, 'utf-8');
  const assignments = buildFixedQuestionSet(JSON.parse(rawSeed), QUESTIONS_PER_DIFFICULTY);
  const schemaSql = await fs.readFile(schemaSqlPath, 'utf-8');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(schemaSql);

    await client.query('TRUNCATE TABLE assignments RESTART IDENTITY CASCADE');

    for (let i = 0; i < assignments.length; i += 1) {
      const item = assignments[i];
      const assignmentIndex = i + 1;
      const schemaName = `a_${assignmentIndex}`;
      const safeSchemaName = safeIdentifier(schemaName);
      const sampleTables = Array.isArray(item.sampleTables) ? item.sampleTables : [];

      await client.query(`DROP SCHEMA IF EXISTS ${safeSchemaName} CASCADE`);
      await client.query(`CREATE SCHEMA ${safeSchemaName}`);

      for (const table of sampleTables) {
        const safeTableName = safeIdentifier(table.tableName);
        const columns = Array.isArray(table.columns) ? table.columns : [];
        const rows = Array.isArray(table.rows) ? table.rows : [];

        if (!columns.length) continue;

        const createColumnsSql = columns
          .map((col) => `${safeIdentifier(col.columnName)} ${mapDataType(col.dataType)}`)
          .join(', ');

        await client.query(`
          CREATE TABLE ${safeSchemaName}.${safeTableName} (
            ${createColumnsSql}
          )
        `);

        for (const row of rows) {
          const columnNames = columns.map((c) => c.columnName);
          const safeColumnNames = columnNames.map((name) => safeIdentifier(name)).join(', ');
          const values = columnNames.map((colName) => row[colName] ?? null);
          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');

          await client.query(
            `INSERT INTO ${safeSchemaName}.${safeTableName} (${safeColumnNames}) VALUES (${placeholders})`,
            values
          );
        }
      }

      const difficulty = normalizeDifficulty(item.description);
      const summary = item.description || `Solve: ${item.question}`;
      const tableNames = sampleTables.map((t) => t.tableName);

      await client.query(
        `
        INSERT INTO assignments (
          title,
          difficulty,
          description,
          question,
          requirements,
          db_schema,
          schema_tables,
          expected_output
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          item.title,
          difficulty,
          summary,
          item.question,
          null,
          schemaName,
          tableNames,
          item.expectedOutput || null
        ]
      );
    }

    await client.query('COMMIT');
    console.log(
      `Seed completed: ${assignments.length} assignments loaded (${QUESTIONS_PER_DIFFICULTY} per difficulty).`
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});

function buildFixedQuestionSet(items, countPerDifficulty) {
  const buckets = { Easy: [], Medium: [], Hard: [] };

  for (const item of items) {
    const difficulty = normalizeDifficulty(item.description);
    if (buckets[difficulty].length < countPerDifficulty) {
      buckets[difficulty].push(item);
    }
  }

  for (const difficulty of Object.keys(buckets)) {
    if (!buckets[difficulty].length) {
      throw new Error(`No ${difficulty} questions found in assignments.seed.json`);
    }

    let variant = 1;
    while (buckets[difficulty].length < countPerDifficulty) {
      const base = buckets[difficulty][(variant - 1) % buckets[difficulty].length];
      buckets[difficulty].push(cloneAsVariant(base, difficulty, variant));
      variant += 1;
    }
  }

  return [...buckets.Easy, ...buckets.Medium, ...buckets.Hard];
}

function cloneAsVariant(item, difficulty, variant) {
  const cloned = JSON.parse(JSON.stringify(item));
  const suffix = buildUniqueSuffix(variant);
  cloned.title = `${item.title} ${suffix}`;
  cloned.question = item.question;
  return cloned;
}

function buildUniqueSuffix(variant) {
  return toRoman(variant + 1);
}

function toRoman(value) {
  const map = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];

  let num = Number(value);
  let output = '';

  for (const [unit, numeral] of map) {
    while (num >= unit) {
      output += numeral;
      num -= unit;
    }
  }

  return output || 'I';
}
