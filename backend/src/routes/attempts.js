import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { assignmentIdSchema, saveAttemptSchema } from '../utils/validators.js';
import { getAttemptSummary, listAttempts, saveAttempt } from '../services/attemptService.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', async (req, res, next) => {
  try {
    const summary = await getAttemptSummary({ userId: req.user.id });
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = saveAttemptSchema.parse(req.body);
    const data = await saveAttempt({
      userId: req.user.id,
      assignmentId: payload.assignmentId,
      sql: payload.sql,
      status: payload.status,
      errorMessage: payload.errorMessage
    });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/:assignmentId', async (req, res, next) => {
  try {
    const { assignmentId } = assignmentIdSchema.parse(req.params);
    const attempts = await listAttempts({
      userId: req.user.id,
      assignmentId
    });
    res.status(200).json(attempts);
  } catch (error) {
    next(error);
  }
});

export default router;
