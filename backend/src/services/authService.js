import bcrypt from 'bcryptjs';
import { createHttpError } from '../middleware/errorHandler.js';
import { signUserToken } from '../middleware/auth.js';
import { getMongoDb } from '../config/mongo.js';

export async function signup({ name, email, password }) {
  const db = getMongoDb();
  const users = db.collection('users');
  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await users.findOne({ email: normalizedEmail });
  if (existing) {
    throw createHttpError(409, 'Email already registered.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await users.insertOne({
    name,
    email: normalizedEmail,
    password_hash: passwordHash,
    created_at: new Date()
  });

  const user = {
    id: String(inserted.insertedId),
    name,
    email: normalizedEmail
  };
  const token = signUserToken(user);

  return { token, user };
}

export async function login({ email, password }) {
  const db = getMongoDb();
  const users = db.collection('users');
  const normalizedEmail = String(email).trim().toLowerCase();

  const found = await users.findOne({ email: normalizedEmail });
  if (!found) {
    throw createHttpError(401, 'Invalid email or password.');
  }

  const ok = await bcrypt.compare(password, found.password_hash);
  if (!ok) {
    throw createHttpError(401, 'Invalid email or password.');
  }

  const user = {
    id: String(found._id),
    name: found.name,
    email: found.email
  };
  const token = signUserToken(user);

  return { token, user };
}
