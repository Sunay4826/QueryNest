import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import assignmentRoutes from './routes/assignments.js';
import queryRoutes from './routes/query.js';
import hintRoutes from './routes/hints.js';
import authRoutes from './routes/auth.js';
import attemptRoutes from './routes/attempts.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDatabase } from './config/initDb.js';
import { initializeMongo } from './config/mongo.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const allowedOrigins = new Set([frontendOrigin]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS blocked for this origin.'));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/hints', hintRoutes);
app.use('/api/attempts', attemptRoutes);

app.use(errorHandler);

start();

function isLocalDevOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

async function start() {
  const allowStartWithoutMongo = toBoolean(process.env.ALLOW_START_WITHOUT_MONGO, true);

  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize PostgreSQL:', error.message);
    process.exit(1);
  }

  try {
    await initializeMongo();
  } catch (error) {
    if (!allowStartWithoutMongo) {
      console.error('Failed to initialize MongoDB:', error.message);
      process.exit(1);
    }
    console.warn(
      `MongoDB is unavailable. Continuing without auth/attempt persistence features. Reason: ${error.message}`
    );
  }

  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
}

function toBoolean(value, fallback) {
  if (value == null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
}
