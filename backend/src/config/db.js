import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: backendEnvPath });

const rawDatabaseUrl = process.env.DATABASE_URL;
const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);

if (!databaseUrl) {
  console.warn('DATABASE_URL is missing. Query execution endpoints will fail until configured.');
}

const poolConfig = {
  connectionString: databaseUrl
};

if (databaseUrl && shouldUseSsl(databaseUrl)) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool({
  ...poolConfig
});

function normalizeDatabaseUrl(value) {
  if (!value) return value;
  const trimmed = String(value).trim();
  if (trimmed.startsWith('fpostgres://')) {
    return trimmed.replace(/^fpostgres:\/\//, 'postgres://');
  }
  return trimmed;
}

function shouldUseSsl(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get('sslmode');
    return sslMode === 'require' || parsed.hostname.endsWith('db.prisma.io');
  } catch {
    return false;
  }
}
