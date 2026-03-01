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
const minQuestionsPerDifficulty = Number(process.env.MIN_QUESTIONS_PER_DIFFICULTY || 15);

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

function makeTable(tableName, columns, rows) {
  return {
    tableName,
    columns: columns.map(([columnName, dataType]) => ({ columnName, dataType })),
    rows
  };
}

function cloneSampleTables(sampleTables) {
  return JSON.parse(JSON.stringify(sampleTables));
}

function toSeedAssignment(item, fallbackDifficulty) {
  return {
    title: item.title,
    description: normalizeDifficulty(item.description || fallbackDifficulty),
    question: item.question,
    sampleTables: Array.isArray(item.sampleTables) ? item.sampleTables : [],
    expectedOutput: item.expectedOutput || null
  };
}

function buildAutoPools() {
  const employeesBase = makeTable(
    'employees',
    [
      ['id', 'INTEGER'],
      ['name', 'TEXT'],
      ['salary', 'INTEGER'],
      ['department', 'TEXT']
    ],
    [
      { id: 1, name: 'Aarav', salary: 42000, department: 'HR' },
      { id: 2, name: 'Maya', salary: 56000, department: 'Engineering' },
      { id: 3, name: 'Rohit', salary: 73000, department: 'Engineering' },
      { id: 4, name: 'Ira', salary: 47000, department: 'Sales' },
      { id: 5, name: 'Kabir', salary: 61000, department: 'Sales' },
      { id: 6, name: 'Nina', salary: 80000, department: 'Marketing' }
    ]
  );

  const customersBase = makeTable(
    'customers',
    [
      ['id', 'INTEGER'],
      ['name', 'TEXT'],
      ['city', 'TEXT']
    ],
    [
      { id: 1, name: 'Aman', city: 'Delhi' },
      { id: 2, name: 'Rhea', city: 'Mumbai' },
      { id: 3, name: 'Dev', city: 'Delhi' },
      { id: 4, name: 'Sara', city: 'Pune' }
    ]
  );

  const ordersBase = makeTable(
    'orders',
    [
      ['id', 'INTEGER'],
      ['customer_id', 'INTEGER'],
      ['amount', 'REAL'],
      ['status', 'TEXT']
    ],
    [
      { id: 1, customer_id: 1, amount: 1200, status: 'completed' },
      { id: 2, customer_id: 1, amount: 800, status: 'pending' },
      { id: 3, customer_id: 2, amount: 1500, status: 'completed' },
      { id: 4, customer_id: 3, amount: 500, status: 'completed' },
      { id: 5, customer_id: 4, amount: 2000, status: 'cancelled' },
      { id: 6, customer_id: 2, amount: 300, status: 'completed' }
    ]
  );

  const easyPrompts = [
    ['Easy Salary > 45000', 'Show employees with salary greater than 45000'],
    ['Easy Salary >= 60000', 'List employees with salary at least 60000'],
    ['Easy HR Employees', 'Return all employees from HR department'],
    ['Easy Engineering Employees', 'Return all employees from Engineering department'],
    ['Easy Sales Employees', 'Return all employees from Sales department'],
    ['Easy Names Starting A', 'Show employee names starting with letter A'],
    ['Easy Names Ending a', 'Show employee names ending with letter a'],
    ['Easy Order By Salary Desc', 'List employees ordered by salary descending'],
    ['Easy Order By Name Asc', 'List employees ordered by name ascending'],
    ['Easy Top 3 Salaries', 'Show top 3 highest-paid employees'],
    ['Easy Low Salary', 'Show employees with salary below 50000'],
    ['Easy Mid Salary Range', 'Show employees with salary between 50000 and 75000'],
    ['Easy Non Engineering', 'Show employees not in Engineering department'],
    ['Easy Select Name Dept', 'Show only employee name and department'],
    ['Easy Salary and Department', 'Show name and salary for employees in Sales department'],
    ['Easy Distinct Departments', 'List all distinct departments'],
    ['Easy Count Employees', 'Find total number of employees'],
    ['Easy Count Sales', 'Find count of employees in Sales department'],
    ['Easy Max Salary', 'Find the maximum salary'],
    ['Easy Min Salary', 'Find the minimum salary']
  ];

  const mediumPrompts = [
    ['Medium Count By Department', 'Find employee count by department'],
    ['Medium Avg Salary By Department', 'Find average salary by department'],
    ['Medium Sum Salary By Department', 'Find total salary by department'],
    ['Medium Departments Having 2 Plus', 'Find departments with at least 2 employees'],
    ['Medium Completed Order Count', 'Count completed orders per customer'],
    ['Medium Total Spend Per Customer', 'Find total order amount per customer'],
    ['Medium Avg Spend Per Customer', 'Find average order amount per customer'],
    ['Medium Customers With No Orders', 'List customers who have no orders'],
    ['Medium Delhi Customer Spend', 'Find total order amount for customers in Delhi'],
    ['Medium Status Wise Revenue', 'Find revenue grouped by order status'],
    ['Medium Top Customer By Spend', 'Find customer with highest total order amount'],
    ['Medium Distinct Customer Cities', 'List distinct customer cities with customer count'],
    ['Medium Orders Above Avg', 'List orders with amount greater than average order amount'],
    ['Medium Completed Revenue By City', 'Find completed order revenue by customer city'],
    ['Medium Customer Order Count', 'Show customer name with number of orders'],
    ['Medium Department Max Salary', 'Find maximum salary in each department'],
    ['Medium Department Min Salary', 'Find minimum salary in each department'],
    ['Medium Employee Rank Prep', 'List employees with salary and department sorted by department then salary desc'],
    ['Medium Pending Orders', 'List customers and their pending order count'],
    ['Medium High Value Customers', 'List customers with total spend above 1000']
  ];

  const hardPrompts = [
    ['Hard Highest Salary Employees', 'Find employee(s) with highest salary'],
    ['Hard Second Highest Salary', 'Find employee(s) with second highest salary'],
    ['Hard Above Department Avg', 'Find employees earning above their department average salary'],
    ['Hard Top Spenders', 'Find top 2 customers by total completed order amount'],
    ['Hard Above Overall Avg Spend', 'Find customers whose total spend is above average customer spend'],
    ['Hard Revenue Leader City', 'Find city with highest completed order revenue'],
    ['Hard Department With Highest Avg', 'Find department(s) with highest average salary'],
    ['Hard Revenue Share', 'Find each customer total and percentage of overall revenue'],
    ['Hard Latest Order Per Customer', 'Find latest order id per customer'],
    ['Hard Repeat Customers', 'Find customers who placed more than one completed order'],
    ['Hard Employees Matching Max In Dept', 'Find employees with maximum salary in their own department'],
    ['Hard Departments Above Company Avg', 'Find departments where average salary exceeds company average'],
    ['Hard Gap From Max Salary', 'Show each employee and difference from maximum salary'],
    ['Hard Order Dense Rank', 'Rank orders by amount in descending order using dense rank'],
    ['Hard Customer Lifetime Value Buckets', 'Bucket customers by total order value (high/medium/low)'],
    ['Hard Top Department Headcount', 'Find department(s) with maximum employee count'],
    ['Hard Customers Without Completed', 'Find customers with no completed orders'],
    ['Hard Salary Percentile Ready', 'Show employees ordered by salary with cumulative total salary'],
    ['Hard Median-like Middle Salary', 'Find middle salary values when salaries are sorted'],
    ['Hard City Above Avg Order', 'Find cities where average order amount is above global average']
  ];

  const easyPool = easyPrompts.map(([title, question], idx) => ({
    title: `${title} Q${idx + 1}`,
    description: 'Easy',
    question,
    sampleTables: cloneSampleTables([employeesBase]),
    expectedOutput: null
  }));

  const mediumPool = mediumPrompts.map(([title, question], idx) => ({
    title: `${title} Q${idx + 1}`,
    description: 'Medium',
    question,
    sampleTables: cloneSampleTables(
      idx % 2 === 0 ? [employeesBase] : [customersBase, ordersBase]
    ),
    expectedOutput: null
  }));

  const hardPool = hardPrompts.map(([title, question], idx) => ({
    title: `${title} Q${idx + 1}`,
    description: 'Hard',
    question,
    sampleTables: cloneSampleTables(
      idx % 3 === 0 ? [customersBase, ordersBase] : [employeesBase]
    ),
    expectedOutput: null
  }));

  return {
    Easy: easyPool,
    Medium: mediumPool,
    Hard: hardPool
  };
}

function ensureMinimumPerDifficulty(seedAssignments, minPerDifficulty) {
  const normalized = seedAssignments.map((item) => toSeedAssignment(item));
  const byDifficulty = {
    Easy: [],
    Medium: [],
    Hard: []
  };

  for (const item of normalized) {
    const difficulty = normalizeDifficulty(item.description);
    byDifficulty[difficulty].push(item);
  }

  const pools = buildAutoPools();

  for (const difficulty of ['Easy', 'Medium', 'Hard']) {
    const existingTitles = new Set(byDifficulty[difficulty].map((a) => a.title));
    for (const candidate of pools[difficulty]) {
      if (byDifficulty[difficulty].length >= minPerDifficulty) break;
      if (existingTitles.has(candidate.title)) continue;
      byDifficulty[difficulty].push(candidate);
      existingTitles.add(candidate.title);
    }

    if (byDifficulty[difficulty].length < minPerDifficulty) {
      throw new Error(
        `Not enough ${difficulty} questions. Have ${byDifficulty[difficulty].length}, need ${minPerDifficulty}.`
      );
    }
  }

  return [...byDifficulty.Easy, ...byDifficulty.Medium, ...byDifficulty.Hard];
}

async function seed() {
  const rawSeed = await fs.readFile(seedFilePath, 'utf-8');
  const parsedAssignments = JSON.parse(rawSeed);
  const assignments = ensureMinimumPerDifficulty(
    parsedAssignments,
    minQuestionsPerDifficulty
  );
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
      const summary = `Solve: ${item.question}`;
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
      `Seed completed: ${assignments.length} assignments loaded (${minQuestionsPerDifficulty} per difficulty minimum).`
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
