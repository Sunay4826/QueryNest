import { pool } from '../config/db.js';
import { getMongoDb } from '../config/mongo.js';
import { createHttpError } from '../middleware/errorHandler.js';

export async function saveAttempt({ userId, assignmentId, sql, status, errorMessage }) {
  const assignmentRes = await pool.query('SELECT id FROM assignments WHERE id = $1 LIMIT 1', [
    assignmentId
  ]);

  if (!assignmentRes.rows.length) {
    throw createHttpError(404, 'Assignment not found.');
  }

  const db = getMongoDb();
  const attempts = db.collection('query_attempts');

  const doc = {
    user_id: String(userId),
    assignment_id: assignmentId,
    sql_query: sql,
    status,
    error_message: errorMessage || null,
    created_at: new Date()
  };

  const inserted = await attempts.insertOne(doc);

  return {
    id: String(inserted.insertedId),
    assignment_id: doc.assignment_id,
    sql_query: doc.sql_query,
    status: doc.status,
    error_message: doc.error_message,
    created_at: doc.created_at
  };
}

export async function listAttempts({ userId, assignmentId }) {
  const db = getMongoDb();
  const attempts = db.collection('query_attempts');

  const docs = await attempts
    .find({ user_id: String(userId), assignment_id: assignmentId })
    .sort({ created_at: -1 })
    .limit(20)
    .toArray();

  return docs.map((doc) => ({
    id: String(doc._id),
    assignment_id: doc.assignment_id,
    sql_query: doc.sql_query,
    status: doc.status,
    error_message: doc.error_message || null,
    created_at: doc.created_at
  }));
}

export async function getAttemptSummary({ userId }) {
  const db = getMongoDb();
  const attempts = db.collection('query_attempts');

  const assignmentIds = await attempts.distinct('assignment_id', {
    user_id: String(userId),
    status: 'success'
  });

  return {
    doneCount: assignmentIds.length
  };
}
