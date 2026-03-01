import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: backendEnvPath });

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || 'querynest';

let client;
let db;

export async function initializeMongo() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing.');
  }

  if (!client) {
    client = new MongoClient(mongoUri);
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
    throw new Error('MongoDB not initialized.');
  }
  return db;
}
