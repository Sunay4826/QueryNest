import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { createHttpError } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: backendEnvPath });

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || 'querynest';
const mongoTlsAllowInvalidCerts = toBoolean(process.env.MONGODB_TLS_ALLOW_INVALID_CERTS, true);
const mongoTlsAllowInvalidHostnames = toBoolean(
  process.env.MONGODB_TLS_ALLOW_INVALID_HOSTNAMES,
  true
);
const mongoTlsInsecure = toBoolean(process.env.MONGODB_TLS_INSECURE, true);
const mongoServerSelectionTimeoutMs = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 8000);

let client;
let db;

export async function initializeMongo() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing.');
  }

  if (!client) {
    const mongoOptions = {
      tls: true,
      serverSelectionTimeoutMS: Number.isFinite(mongoServerSelectionTimeoutMs)
        ? mongoServerSelectionTimeoutMs
        : 8000
    };

    // Mongo driver disallows mixing tlsInsecure with allowInvalid* flags.
    if (mongoTlsInsecure) {
      mongoOptions.tlsInsecure = true;
    } else {
      mongoOptions.tlsAllowInvalidCertificates = mongoTlsAllowInvalidCerts;
      mongoOptions.tlsAllowInvalidHostnames = mongoTlsAllowInvalidHostnames;
    }

    client = new MongoClient(mongoUri, mongoOptions);
    await client.connect();
    db = client.db(mongoDbName);

    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('query_attempts').createIndex(
      { user_id: 1, assignment_id: 1, created_at: -1 },
      { name: 'idx_user_assignment_created' }
    );
  }

  return db;
}

export function getMongoDb() {
  if (!db) {
    throw createHttpError(
      503,
      'Authentication and attempt history are temporarily unavailable. Please try again shortly.'
    );
  }
  return db;
}

function toBoolean(value, fallback) {
  if (value == null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
}
