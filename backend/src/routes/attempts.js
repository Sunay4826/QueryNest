import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { assignmentIdSchema, saveAttemptSchema } from '../utils/validators.js';
import { listAttempts, saveAttempt } from '../services/attemptService.js';

const router = Router();

router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const payload = saveAttemptSchema.parse(req.body);
    const data = await saveAttempt({
      userId: req.user.id,
      assignmentId: payload.assignmentId,
      sql: payload.sql,
      status: payload.status,
      isCorrect: payload.isCorrect,
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
