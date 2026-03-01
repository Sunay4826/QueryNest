import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaSqlPath = path.resolve(__dirname, '../../sql/schema.sql');

export async function initializeDatabase() {
  const schemaSql = await fs.readFile(schemaSqlPath, 'utf-8');
  await pool.query(schemaSql);
}
