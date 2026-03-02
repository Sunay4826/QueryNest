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
const pgRejectUnauthorized = toBoolean(process.env.PG_SSL_REJECT_UNAUTHORIZED, false);
const usePgSsl = shouldUseSsl(rawDatabaseUrl) || shouldUseSsl(databaseUrl);

if (!databaseUrl) {
  console.warn('DATABASE_URL is missing. Query execution endpoints will fail until configured.');
}

const poolConfig = {
  connectionString: databaseUrl
};

if (databaseUrl && usePgSsl) {
  poolConfig.ssl = { rejectUnauthorized: pgRejectUnauthorized };
}

export const pool = new Pool({
  ...poolConfig
});

function normalizeDatabaseUrl(value) {
  if (!value) return value;
  let trimmed = String(value).trim();
  if (trimmed.startsWith('fpostgres://')) {
    trimmed = trimmed.replace(/^fpostgres:\/\//, 'postgres://');
  }

  try {
    const parsed = new URL(trimmed);
    const sslMode = parsed.searchParams.get('sslmode');

    if (sslMode) {
      // Prefer explicit pg ssl config over URL-level sslmode parsing.
      parsed.searchParams.delete('sslmode');
      parsed.searchParams.delete('uselibpqcompat');
      return parsed.toString();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function shouldUseSsl(connectionString) {
  if (!connectionString) return false;

  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get('sslmode');
    const host = parsed.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const knownManaged =
      host.endsWith('db.prisma.io') ||
      host.endsWith('supabase.co') ||
      host.endsWith('neon.tech') ||
      host.endsWith('railway.app');

    return sslMode === 'require' || knownManaged || !isLocal;
  } catch {
    return false;
  }
}

function toBoolean(value, fallback) {
  if (value == null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
}
